/**
 * Scheduled social posts for affiliates — Associate AI drafts + auto-post queue.
 * In-memory MVP; integrates with native share / platform APIs on the client.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";

export type SocialPlatform = "facebook" | "instagram" | "twitter" | "linkedin" | "tiktok";

export type ScheduledSocialPost = {
  id: string;
  affiliateUserId: string;
  platform: SocialPlatform;
  body: string;
  affiliateLink: string;
  scheduledAt: string;
  postedAt?: string;
  status: "draft" | "scheduled" | "posted" | "failed";
  autoPost: boolean;
  createdAt: string;
};

const posts = new Map<string, ScheduledSocialPost>();

const PLATFORM_HASHTAGS: Record<SocialPlatform, string> = {
  facebook: "#URPlatform #ContentCreators",
  instagram: "#URPlatform #CreatorEconomy #Affiliate",
  twitter: "#URPlatform #Creators",
  linkedin: "#URPlatform #ContentCreation",
  tiktok: "#URPlatform #Creators #SideHustle",
};

export function buildAffiliatePostBody(params: {
  affiliateLink: string;
  platform: SocialPlatform;
  hook?: string;
}): string {
  const hook =
    params.hook ??
    "Creators on UR Platform earn 85% on live classes with instant payouts. Join free:";
  return `${hook}\n\n${params.affiliateLink}\n\n${PLATFORM_HASHTAGS[params.platform]}\n\n⚠️ AI-generated promo. UR Platform may earn commission on qualifying sign-ups.`;
}

export function scheduleAffiliatePost(params: {
  affiliateUserId: string;
  platform: SocialPlatform;
  body: string;
  affiliateLink: string;
  scheduledAt?: string;
  autoPost?: boolean;
}): ScheduledSocialPost {
  const post: ScheduledSocialPost = {
    id: randomUUID(),
    affiliateUserId: params.affiliateUserId,
    platform: params.platform,
    body: params.body.slice(0, 2000),
    affiliateLink: params.affiliateLink,
    scheduledAt: params.scheduledAt ?? new Date().toISOString(),
    status: params.autoPost ? "scheduled" : "draft",
    autoPost: params.autoPost ?? false,
    createdAt: new Date().toISOString(),
  };
  posts.set(post.id, post);
  return post;
}

export function listAffiliatePosts(affiliateUserId: string): ScheduledSocialPost[] {
  return [...posts.values()]
    .filter((p) => p.affiliateUserId === affiliateUserId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function markPostPosted(postId: string, affiliateUserId: string): ScheduledSocialPost {
  const post = posts.get(postId);
  if (!post || post.affiliateUserId !== affiliateUserId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Post not found." });
  }
  post.status = "posted";
  post.postedAt = new Date().toISOString();
  posts.set(postId, post);
  return post;
}

/** Process due auto-posts (cron / on-demand). Returns posts ready for client share intent. */
export function processDueAutoPosts(now = Date.now()): ScheduledSocialPost[] {
  const ready: ScheduledSocialPost[] = [];
  for (const post of posts.values()) {
    if (post.status !== "scheduled" || !post.autoPost) continue;
    if (new Date(post.scheduledAt).getTime() <= now) {
      post.status = "posted";
      post.postedAt = new Date().toISOString();
      posts.set(post.id, post);
      ready.push(post);
    }
  }
  return ready;
}

export function scheduleWeeklyAutoPosts(params: {
  affiliateUserId: string;
  affiliateLink: string;
  platforms?: SocialPlatform[];
}): ScheduledSocialPost[] {
  const platforms = params.platforms ?? ["facebook", "twitter", "instagram"];
  const created: ScheduledSocialPost[] = [];
  const base = Date.now();
  platforms.forEach((platform, i) => {
    const scheduledAt = new Date(base + (i + 1) * 24 * 60 * 60 * 1000).toISOString();
    const body = buildAffiliatePostBody({
      affiliateLink: params.affiliateLink,
      platform,
    });
    created.push(
      scheduleAffiliatePost({
        affiliateUserId: params.affiliateUserId,
        platform,
        body,
        affiliateLink: params.affiliateLink,
        scheduledAt,
        autoPost: true,
      }),
    );
  });
  return created;
}
