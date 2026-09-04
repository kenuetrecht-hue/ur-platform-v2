import { describe, it, expect } from "vitest";
import {
  createFeedPost,
  togglePostLike,
  addPostComment,
  getFeed,
  getTrendingHashtags,
  deleteFeedPost,
  recordPostShare,
  reactToPostWithStamp,
} from "../server/_core/social-feed-service";
import { registerSocialUser } from "../server/_core/social-service";
import { purchaseThanksStampPack, getThanksStampsWallet } from "../server/_core/ur-thanks-stamps-service";
import { enrollContentCreator } from "../server/_core/partner-program-service";

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

    const share = recordPostShare(post.id);
    expect(share.shareCount).toBeGreaterThanOrEqual(1);
    expect(share.shareText).toContain("Author");
    expect(share.shareText).toContain("UR Platform");

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

  it("blocks another member from republishing an original caption to farm views", () => {
    const body = "My exclusive winterization walkthrough for twin Yamaha outboards this season.";
    createFeedPost({
      authorUserId: authorId,
      authorEmail: "author@test.com",
      authorName: "Author",
      body,
      rightsConfirmed: true,
    });
    expect(() =>
      createFeedPost({
        authorUserId: viewerId,
        authorEmail: "viewer@test.com",
        authorName: "Viewer",
        body,
        rightsConfirmed: true,
      }),
    ).toThrow(/already registered to another creator/);
  });

  it("lets casual members stick a purchased stamp on a post like an emoji", () => {
    enrollContentCreator({
      userId: authorId,
      userEmail: "author@test.com",
      displayName: "Author",
    });
    const post = createFeedPost({
      authorUserId: authorId,
      authorEmail: "author@test.com",
      authorName: "Author",
      body: "New class this Friday #stamps",
      rightsConfirmed: true,
    });
    purchaseThanksStampPack({ userId: viewerId, userEmail: "viewer@test.com", packId: "thanks_1" });
    const stamp = getThanksStampsWallet(viewerId).items[0]!;
    const reaction = reactToPostWithStamp({
      postId: post.id,
      userId: viewerId,
      displayName: "Viewer Friend",
      instanceId: stamp.instanceId,
    });
    expect(reaction.mark).toBeTruthy();
    expect(getThanksStampsWallet(viewerId).count).toBe(3);
    const feed = getFeed({ viewerUserId: viewerId, sort: "latest" });
    const found = feed.posts.find((p) => p.id === post.id);
    expect(found?.stampReactions.some((row) => row.id === reaction.id)).toBe(true);
    expect(found?.authorIsCreator).toBe(true);
  });
});
