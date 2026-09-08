import { describe, it, expect, beforeEach } from "vitest";
import {
  rateVideo,
  getVideoRating,
  assertFreeVideoShareAllowed,
  buildFreeVideoShareText,
  _resetVideoRatingsForTests,
} from "../server/_core/video-rating-service";
import {
  createFeedPost,
  getFeed,
  recordPostShare,
  assertVideoPostForRating,
} from "../server/_core/social-feed-service";
import { registerSocialUser } from "../server/_core/social-service";
import {
  CREATOR_FOLLOWER_DEFINITION,
  CREATOR_FREE_CONTENT_INCOME_RULE,
  CREATOR_PAID_INCOME_GOAL,
  CREATOR_PAID_SUBSCRIBER_DEFINITION,
  isFreeShareableVideoKind,
} from "../lib/creator-free-content-policy";
import { CREATOR_FOLLOWER_VS_SUBSCRIBER_RULE } from "../lib/creator-audience-policy";

describe("video star ratings", () => {
  beforeEach(() => _resetVideoRatingsForTests());

  it("records one 1–5 star rating per person and averages them", () => {
    rateVideo({ contentId: "vid-1", kind: "social_video", userId: "a", stars: 5 });
    rateVideo({ contentId: "vid-1", kind: "social_video", userId: "b", stars: 3 });
    const summary = getVideoRating("vid-1", "a");
    expect(summary.average).toBe(4);
    expect(summary.count).toBe(2);
    expect(summary.myStars).toBe(5);
    rateVideo({ contentId: "vid-1", kind: "social_video", userId: "a", stars: 1 });
    expect(getVideoRating("vid-1", "a")).toMatchObject({ average: 2, count: 2, myStars: 1 });
  });

  it("rejects stars outside 1–5", () => {
    expect(() =>
      rateVideo({ contentId: "vid-1", kind: "social_video", userId: "a", stars: 0 }),
    ).toThrow(/1 to 5/);
    expect(() =>
      rateVideo({ contentId: "vid-1", kind: "social_video", userId: "a", stars: 6 }),
    ).toThrow(/1 to 5/);
  });
});

describe("free video sharing", () => {
  it("allows share of free social videos and cartoons only", () => {
    expect(isFreeShareableVideoKind("social_video")).toBe(true);
    expect(isFreeShareableVideoKind("cartoon")).toBe(true);
    expect(isFreeShareableVideoKind("class_replay")).toBe(false);
    expect(isFreeShareableVideoKind("live_class")).toBe(false);
    expect(() => assertFreeVideoShareAllowed("live_class")).toThrow(/cannot be shared/);
    const share = buildFreeVideoShareText({
      title: "Shop tour",
      creatorName: "Marina",
      href: "/(tabs)/messages",
      kind: "social_video",
    });
    expect(share.shareText).toContain("Marina");
    expect(share.shareText.toLowerCase()).toContain("do not pay the creator");
  });
});

describe("social video posts", () => {
  const authorId = "rate-author-1";
  const viewerId = "rate-viewer-1";

  registerSocialUser({ userId: authorId, email: "a@test.com", displayName: "Author" });
  registerSocialUser({ userId: viewerId, email: "v@test.com", displayName: "Viewer" });

  it("attaches ratings to video posts and blocks sharing friends-only posts", () => {
    const video = createFeedPost({
      authorUserId: authorId,
      authorEmail: "a@test.com",
      authorName: "Author",
      body: "Free shop tip",
      videoUrl: "https://example.com/free.mp4",
      rightsConfirmed: true,
    });
    assertVideoPostForRating(video.id);
    rateVideo({ contentId: video.id, kind: "social_video", userId: viewerId, stars: 4 });
    const feed = getFeed({ viewerUserId: viewerId, sort: "latest" });
    const found = feed.posts.find((p) => p.id === video.id);
    expect(found?.rating?.average).toBe(4);
    expect(found?.rating?.myStars).toBe(4);
    expect(found?.isFreeShareable).toBe(true);
    const shared = recordPostShare(video.id);
    expect(shared.shareText.toLowerCase()).toContain("free");

    const privatePost = createFeedPost({
      authorUserId: authorId,
      authorEmail: "a@test.com",
      authorName: "Author",
      body: "Friends only",
      visibility: "friends",
      rightsConfirmed: true,
    });
    expect(() => recordPostShare(privatePost.id)).toThrow(/public free posts/);
    expect(() => assertVideoPostForRating(privatePost.id)).toThrow(/only videos/i);
  });
});

describe("creator income copy", () => {
  it("states free posts do not pay and followers are not subscribers", () => {
    expect(CREATOR_FREE_CONTENT_INCOME_RULE.toLowerCase()).toContain("not paid");
    expect(CREATOR_FREE_CONTENT_INCOME_RULE.toLowerCase()).toContain("advertising");
    expect(CREATOR_PAID_INCOME_GOAL.toLowerCase()).toContain("paid subscribers");
    expect(CREATOR_FOLLOWER_DEFINITION.toLowerCase()).toContain("not paying");
    expect(CREATOR_PAID_SUBSCRIBER_DEFINITION.toLowerCase()).toContain("pays");
    expect(CREATOR_FOLLOWER_VS_SUBSCRIBER_RULE.toLowerCase()).toContain("not income");
  });
});
