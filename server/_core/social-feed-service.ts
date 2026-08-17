/**
 * Public social feed — Facebook/TikTok-style free posts, likes, comments, shares.
 * In-memory MVP (persist to DB before production).
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { messageContainsAffiliateLink } from "../../lib/affiliate-disclosure";
import { listFriends, registerSocialUser } from "./social-service";
import {
  assertCreatorDisplayNameAllowed,
  assertContentRights,
  assertUserCanPublish,
  mapContentProtectionError,
  registerAndVerifyContent,
} from "./creator-content-protection-service";
import {
  bodyWithAttribution,
  type ContentLicenseType,
  type ContentRightsMode,
} from "../../lib/creator-content-protection-core";

export type PostVisibility = "public" | "friends";
export type PostKind = "text" | "photo" | "video" | "link";

export type SocialUserProfile = {
  userId: string;
  email: string;
  displayName: string;
  avatarEmoji: string;
  bio?: string;
  updatedAt: string;
};

export type FeedPost = {
  id: string;
  authorUserId: string;
  authorName: string;
  authorAvatar: string;
  body: string;
  kind: PostKind;
  imageUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
  visibility: PostVisibility;
  hashtags: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  hasAffiliateContent: boolean;
  hasAiDisclosure: boolean;
  contentRightsMode: ContentRightsMode;
  attributionSourceName?: string;
  attributionSourceUrl?: string;
  licenseType?: ContentLicenseType;
  createdAt: string;
  updatedAt: string;
};

export type FeedComment = {
  id: string;
  postId: string;
  authorUserId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type FeedPostView = FeedPost & {
  likedByMe: boolean;
  recentComments: FeedComment[];
};

const profiles = new Map<string, SocialUserProfile>();
const posts = new Map<string, FeedPost>();
const likes = new Map<string, Set<string>>(); // postId -> userIds
const comments: FeedComment[] = [];
const shares = new Map<string, number>();

const AVATAR_EMOJIS = ["😊", "🙂", "😎", "🤩", "🧑‍🔧", "👷", "🎬", "🔗", "✨", "🚀"];

function avatarFor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash + userId.charCodeAt(i)) % AVATAR_EMOJIS.length;
  return AVATAR_EMOJIS[hash] ?? "😊";
}

export function upsertSocialProfile(params: {
  userId: string;
  email: string;
  displayName: string;
  bio?: string;
}): SocialUserProfile {
  registerSocialUser(params);
  try {
    assertCreatorDisplayNameAllowed({
      userId: params.userId,
      displayName: params.displayName,
    });
  } catch (error) {
    mapContentProtectionError(error);
  }
  const existing = profiles.get(params.userId);
  const profile: SocialUserProfile = {
    userId: params.userId,
    email: params.email.toLowerCase().trim(),
    displayName: params.displayName.trim().slice(0, 80) || "UR Member",
    avatarEmoji: existing?.avatarEmoji ?? avatarFor(params.userId),
    bio: params.bio?.slice(0, 280),
    updatedAt: new Date().toISOString(),
  };
  profiles.set(params.userId, profile);
  return profile;
}

export function getSocialProfile(userId: string): SocialUserProfile | null {
  return profiles.get(userId) ?? null;
}

function extractHashtags(text: string): string[] {
  const tags = text.match(/#[\w\u0080-\uFFFF]{2,40}/g) ?? [];
  return [...new Set(tags.map((t) => t.toLowerCase()))].slice(0, 10);
}

function detectAffiliateOrAi(body: string, urls: string[]): { affiliate: boolean; ai: boolean } {
  const combined = `${body} ${urls.join(" ")}`;
  const affiliate = messageContainsAffiliateLink(combined) || urls.some((u) => /affiliate|ref=|tag=/i.test(u));
  const ai = /\b(AI[- ]generated|written by an AI|#AI|ContentMate|Associate AI)\b/i.test(body);
  return { affiliate, ai: ai || affiliate };
}

function enrichPost(post: FeedPost, viewerUserId: string): FeedPostView {
  const postLikes = likes.get(post.id) ?? new Set();
  const postComments = comments
    .filter((c) => c.postId === post.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return {
    ...post,
    contentRightsMode: post.contentRightsMode ?? "original",
    likeCount: postLikes.size,
    commentCount: postComments.length,
    shareCount: shares.get(post.id) ?? 0,
    likedByMe: postLikes.has(viewerUserId),
    recentComments: postComments.slice(0, 3),
  };
}

function canViewPost(post: FeedPost, viewerUserId: string): boolean {
  if (post.visibility === "public") return true;
  if (post.authorUserId === viewerUserId) return true;
  const friends = listFriends(viewerUserId);
  return friends.some((f) => f.peerUserId === post.authorUserId);
}

export function createFeedPost(params: {
  authorUserId: string;
  authorEmail: string;
  authorName: string;
  body: string;
  kind?: PostKind;
  imageUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
  visibility?: PostVisibility;
  aiAssisted?: boolean;
  contentRightsMode?: ContentRightsMode;
  rightsConfirmed?: boolean;
  /** @deprecated Use rightsConfirmed */
  ownsOrLicensedContent?: boolean;
  attributionSourceName?: string;
  attributionSourceUrl?: string;
  licenseType?: ContentLicenseType;
}): FeedPost {
  const contentRightsMode = params.contentRightsMode ?? "original";
  const rightsConfirmed = params.rightsConfirmed ?? params.ownsOrLicensedContent;

  try {
    assertUserCanPublish(params.authorUserId);
    assertContentRights({
      contentRightsMode,
      rightsConfirmed,
      attributionSourceName: params.attributionSourceName,
      attributionSourceUrl: params.attributionSourceUrl,
      licenseType: params.licenseType,
    });
  } catch (error) {
    mapContentProtectionError(error);
  }

  const profile = upsertSocialProfile({
    userId: params.authorUserId,
    email: params.authorEmail,
    displayName: params.authorName,
  });

  let body = params.body.trim().slice(0, 4000);
  const imageUrl = params.imageUrl?.trim().slice(0, 2000);
  const videoUrl = params.videoUrl?.trim().slice(0, 2000);
  const linkUrl = params.linkUrl?.trim().slice(0, 2000);

  if (contentRightsMode === "licensed_repost" && params.attributionSourceName && params.licenseType) {
    body = bodyWithAttribution({
      body,
      attributionSourceName: params.attributionSourceName,
      attributionSourceUrl: params.attributionSourceUrl,
      licenseType: params.licenseType,
    });
  }

  if (!body && !imageUrl && !videoUrl) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Add text, a photo, or a video." });
  }

  const postId = randomUUID();

  try {
    registerAndVerifyContent({
      ownerUserId: params.authorUserId,
      source: "social_post",
      sourceId: postId,
      body,
      imageUrl,
      videoUrl,
      linkUrl,
      contentRightsMode,
      attributionSourceName: params.attributionSourceName,
      attributionSourceUrl: params.attributionSourceUrl,
      licenseType: params.licenseType,
    });
  } catch (error) {
    mapContentProtectionError(error);
  }

  let kind: PostKind = params.kind ?? "text";
  if (videoUrl) kind = "video";
  else if (imageUrl) kind = "photo";
  else if (linkUrl) kind = "link";

  const flags = detectAffiliateOrAi(body, [imageUrl ?? "", videoUrl ?? "", linkUrl ?? ""]);
  if (params.aiAssisted) flags.ai = true;

  const post: FeedPost = {
    id: postId,
    authorUserId: params.authorUserId,
    authorName: profile.displayName,
    authorAvatar: profile.avatarEmoji,
    body,
    kind,
    imageUrl: imageUrl || undefined,
    videoUrl: videoUrl || undefined,
    linkUrl: linkUrl || undefined,
    visibility: params.visibility ?? "public",
    hashtags: extractHashtags(body),
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    hasAffiliateContent: flags.affiliate,
    hasAiDisclosure: flags.ai,
    contentRightsMode,
    attributionSourceName: params.attributionSourceName?.trim() || undefined,
    attributionSourceUrl: params.attributionSourceUrl?.trim() || undefined,
    licenseType: params.licenseType,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  posts.set(post.id, post);
  likes.set(post.id, new Set());
  return post;
}

export function deleteFeedPost(params: { postId: string; userId: string }): boolean {
  const post = posts.get(params.postId);
  if (!post) return false;
  if (post.authorUserId !== params.userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own posts." });
  }
  posts.delete(params.postId);
  likes.delete(params.postId);
  for (let i = comments.length - 1; i >= 0; i--) {
    if (comments[i]!.postId === params.postId) comments.splice(i, 1);
  }
  return true;
}

export function togglePostLike(params: { postId: string; userId: string }): { liked: boolean; likeCount: number } {
  const post = posts.get(params.postId);
  if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found." });
  const set = likes.get(params.postId) ?? new Set<string>();
  let liked: boolean;
  if (set.has(params.userId)) {
    set.delete(params.userId);
    liked = false;
  } else {
    set.add(params.userId);
    liked = true;
  }
  likes.set(params.postId, set);
  return { liked, likeCount: set.size };
}

export function addPostComment(params: {
  postId: string;
  authorUserId: string;
  authorName: string;
  body: string;
}): FeedComment {
  const post = posts.get(params.postId);
  if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found." });
  const body = params.body.trim().slice(0, 1000);
  if (!body) throw new TRPCError({ code: "BAD_REQUEST", message: "Comment cannot be empty." });

  upsertSocialProfile({
    userId: params.authorUserId,
    email: "",
    displayName: params.authorName,
  });

  const comment: FeedComment = {
    id: randomUUID(),
    postId: params.postId,
    authorUserId: params.authorUserId,
    authorName: params.authorName.slice(0, 80),
    body,
    createdAt: new Date().toISOString(),
  };
  comments.push(comment);
  post.commentCount = comments.filter((c) => c.postId === params.postId).length;
  post.updatedAt = new Date().toISOString();
  posts.set(params.postId, post);
  return comment;
}

export function listPostComments(postId: string, limit = 50): FeedComment[] {
  return comments
    .filter((c) => c.postId === postId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-limit);
}

export function recordPostShare(postId: string): number {
  const post = posts.get(postId);
  if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found." });
  const count = (shares.get(postId) ?? 0) + 1;
  shares.set(postId, count);
  return count;
}

export type FeedSort = "latest" | "top" | "friends";

export function getFeed(params: {
  viewerUserId: string;
  sort?: FeedSort;
  hashtag?: string;
  authorUserId?: string;
  limit?: number;
  cursor?: string;
}): { posts: FeedPostView[]; nextCursor: string | null } {
  const limit = Math.min(params.limit ?? 30, 50);
  let list = [...posts.values()].filter((p) => canViewPost(p, params.viewerUserId));

  if (params.authorUserId) {
    list = list.filter((p) => p.authorUserId === params.authorUserId);
  }
  if (params.hashtag) {
    const tag = params.hashtag.startsWith("#") ? params.hashtag.toLowerCase() : `#${params.hashtag.toLowerCase()}`;
    list = list.filter((p) => p.hashtags.includes(tag));
  }
  if (params.sort === "friends") {
    const friendIds = new Set(listFriends(params.viewerUserId).map((f) => f.peerUserId));
    friendIds.add(params.viewerUserId);
    list = list.filter((p) => friendIds.has(p.authorUserId));
  }

  if (params.sort === "top") {
    list.sort((a, b) => {
      const scoreA = (likes.get(a.id)?.size ?? 0) + (comments.filter((c) => c.postId === a.id).length * 2);
      const scoreB = (likes.get(b.id)?.size ?? 0) + (comments.filter((c) => c.postId === b.id).length * 2);
      return scoreB - scoreA || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  if (params.cursor) {
    const cursorTime = new Date(params.cursor).getTime();
    list = list.filter((p) => new Date(p.createdAt).getTime() < cursorTime);
  }

  const slice = list.slice(0, limit).map((p) => enrichPost(p, params.viewerUserId));
  const nextCursor =
    list.length > limit && slice.length > 0 ? slice[slice.length - 1]!.createdAt : null;
  return { posts: slice, nextCursor };
}

export function getTrendingHashtags(limit = 8): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const post of posts.values()) {
    for (const tag of post.hashtags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

export function getFeedStats(userId: string): {
  postCount: number;
  totalLikesReceived: number;
  friendCount: number;
} {
  const myPosts = [...posts.values()].filter((p) => p.authorUserId === userId);
  let totalLikes = 0;
  for (const p of myPosts) {
    totalLikes += likes.get(p.id)?.size ?? 0;
  }
  return {
    postCount: myPosts.length,
    totalLikesReceived: totalLikes,
    friendCount: listFriends(userId).length,
  };
}
