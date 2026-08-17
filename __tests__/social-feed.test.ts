import { describe, it, expect } from "vitest";
import {
  createFeedPost,
  togglePostLike,
  addPostComment,
  getFeed,
  getTrendingHashtags,
  deleteFeedPost,
  recordPostShare,
} from "../server/_core/social-feed-service";
import { registerSocialUser } from "../server/_core/social-service";

describe("Social feed", () => {
  const authorId = "feed-author-1";
  const viewerId = "feed-viewer-1";

  registerSocialUser({ userId: authorId, email: "author@test.com", displayName: "Author" });
  registerSocialUser({ userId: viewerId, email: "viewer@test.com", displayName: "Viewer" });

  it("creates public posts with hashtags and affiliate flags", () => {
    const post = createFeedPost({
      authorUserId: authorId,
      authorEmail: "author@test.com",
      authorName: "Author",
      body: "Check out my project #URPlatform https://amazon.com/dp/B001?tag=affiliate-20",
      rightsConfirmed: true,
    });
    expect(post.visibility).toBe("public");
    expect(post.hashtags).toContain("#urplatform");
    expect(post.hasAffiliateContent).toBe(true);
    expect(post.hasAiDisclosure).toBe(true);
  });

  it("supports likes, comments, shares, and top sort", () => {
    const post = createFeedPost({
      authorUserId: authorId,
      authorEmail: "author@test.com",
      authorName: "Author",
      body: "Hello world #trending",
      rightsConfirmed: true,
    });

    const like = togglePostLike({ postId: post.id, userId: viewerId });
    expect(like.liked).toBe(true);
    expect(like.likeCount).toBe(1);

    const comment = addPostComment({
      postId: post.id,
      authorUserId: viewerId,
      authorName: "Viewer",
      body: "Nice post!",
    });
    expect(comment.body).toBe("Nice post!");

    const shareCount = recordPostShare(post.id);
    expect(shareCount).toBeGreaterThanOrEqual(1);

    const feed = getFeed({ viewerUserId: viewerId, sort: "top" });
    const found = feed.posts.find((p) => p.id === post.id);
    expect(found?.likeCount).toBe(1);
    expect(found?.commentCount).toBe(1);
    expect(found?.likedByMe).toBe(true);
  });

  it("hides friends-only posts from non-friends and tracks trending hashtags", () => {
    createFeedPost({
      authorUserId: authorId,
      authorEmail: "author@test.com",
      authorName: "Author",
      body: "Friends only #private",
      visibility: "friends",
      rightsConfirmed: true,
    });

    const publicView = getFeed({ viewerUserId: viewerId, sort: "latest" });
    expect(publicView.posts.some((p) => p.body === "Friends only #private")).toBe(false);

    const trending = getTrendingHashtags();
    expect(trending.some((t) => t.tag === "#trending" || t.tag === "#urplatform")).toBe(true);
  });

  it("allows authors to delete their posts", () => {
    const post = createFeedPost({
      authorUserId: authorId,
      authorEmail: "author@test.com",
      authorName: "Author",
      body: "Temporary post",
      rightsConfirmed: true,
    });
    expect(deleteFeedPost({ postId: post.id, userId: authorId })).toBe(true);
    const feed = getFeed({ viewerUserId: authorId });
    expect(feed.posts.some((p) => p.id === post.id)).toBe(false);
  });
});
