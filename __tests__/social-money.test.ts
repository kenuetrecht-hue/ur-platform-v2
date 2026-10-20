import { afterEach, describe, expect, it } from "vitest";
import { splitCreatorStripeCharge } from "../lib/stripe-connect-split";
import {
  CREATOR_CHANNEL_CENTS,
  CREATOR_CHANNEL_DAYS,
  FEED_PIN_CENTS,
  socialDailyPrompt,
} from "../lib/social-money";
import {
  _resetCreatorAudienceForTests,
  hasPaidChannelSubscription,
  startPaidChannelSubscription,
} from "../server/_core/creator-audience-service";
import { enrollContentCreator } from "../server/_core/partner-program-service";
import {
  createFeedPost,
  deleteFeedPost,
  getFeed,
  grantFeedPin,
} from "../server/_core/social-feed-service";
import { faceFiltersUnlocked, _resetFaceFilterPassesForTests } from "../server/_core/face-filter-pass-service";
import {
  acceptFriendRequest,
  registerSocialUser,
  sendFriendRequest,
} from "../server/_core/social-service";
import { buildSocialPostNotice, friendPostAlertRecipients } from "../server/_core/call-ring-service";

const authorId = "social-money-author";
const fanId = "social-money-fan";
const strangerId = "social-money-stranger";

describe("social money", () => {
  afterEach(() => {
    _resetCreatorAudienceForTests();
    _resetFaceFilterPassesForTests();
  });

  it("charges $2.99 and $1.99, never exactly $5, and splits the paid follow 85/15", () => {
    expect(CREATOR_CHANNEL_CENTS).toBe(299);
    expect(FEED_PIN_CENTS).toBe(199);
    expect(CREATOR_CHANNEL_CENTS).not.toBe(500);
    expect(FEED_PIN_CENTS).not.toBe(500);
    expect(CREATOR_CHANNEL_DAYS).toBe(30);
    const split = splitCreatorStripeCharge({
      kind: "sale",
      subtotalCents: CREATOR_CHANNEL_CENTS,
      salesTaxCents: 0,
      stateFeeCents: 0,
      saleShare: 0.85,
    });
    expect(split.creatorCents).toBe(254);
    expect(split.platformFeeCents).toBe(45);
    expect(socialDailyPrompt(new Date("2026-10-20T12:00:00.000Z")).length).toBeGreaterThan(10);
  });

  it("hides members posts from people who have not paid, and unlocks Monday looks for a paid follow", () => {
    enrollContentCreator({
      userId: authorId,
      userEmail: "social-money-author@test.com",
      displayName: "Money Author",
      enrolledAt: new Date("2027-03-01T00:00:00.000Z"),
    });
    const post = createFeedPost({
      authorUserId: authorId,
      authorEmail: "social-money-author@test.com",
      authorName: "Money Author",
      body: "Members only winterization note for the paid follow test.",
      visibility: "members",
      rightsConfirmed: true,
    });
    expect(getFeed({ viewerUserId: strangerId, sort: "latest" }).posts.some((row) => row.id === post.id)).toBe(false);
    expect(faceFiltersUnlocked(fanId, false)).toBe(false);
    startPaidChannelSubscription({ subscriberUserId: fanId, creatorUserId: authorId });
    expect(hasPaidChannelSubscription(fanId, authorId)).toBe(true);
    expect(getFeed({ viewerUserId: fanId, sort: "latest" }).posts.some((row) => row.id === post.id)).toBe(true);
    expect(faceFiltersUnlocked(fanId, false)).toBe(true);
    deleteFeedPost({ postId: post.id, userId: authorId });
  });

  it("puts a fresh pin above an older post and drops an expired pin", () => {
    const older = createFeedPost({
      authorUserId: strangerId,
      authorEmail: "social-money-stranger@test.com",
      authorName: "Stranger",
      body: "Older public note for the pin sort test.",
      rightsConfirmed: true,
    });
    const newer = createFeedPost({
      authorUserId: strangerId,
      authorEmail: "social-money-stranger@test.com",
      authorName: "Stranger",
      body: "Newer public note for the pin sort test.",
      rightsConfirmed: true,
    });
    grantFeedPin({ postId: older.id, buyerUserId: strangerId });
    const feed = getFeed({ viewerUserId: fanId, sort: "latest" }).posts.filter((row) =>
      row.body.includes("pin sort test"),
    );
    expect(feed[0]?.id).toBe(older.id);
    grantFeedPin({ postId: older.id, buyerUserId: strangerId, hours: -1 });
    const after = getFeed({ viewerUserId: fanId, sort: "latest" }).posts.filter((row) =>
      row.body.includes("pin sort test"),
    );
    expect(after[0]?.id).toBe(newer.id);
    deleteFeedPost({ postId: older.id, userId: strangerId });
    deleteFeedPost({ postId: newer.id, userId: strangerId });
  });

  it("alerts friends about a post without opening the call screen, and skips members posts they cannot see", () => {
    registerSocialUser({ userId: authorId, email: "social-money-author@test.com", displayName: "Money Author" });
    registerSocialUser({ userId: fanId, email: "social-money-fan@test.com", displayName: "Fan" });
    const request = sendFriendRequest({
      fromUserId: authorId,
      fromEmail: "social-money-author@test.com",
      fromName: "Money Author",
      toEmail: "social-money-fan@test.com",
    });
    acceptFriendRequest({ userId: fanId, friendshipId: request.id });
    const notice = JSON.parse(buildSocialPostNotice("Money Author")) as { url: string; roomId: string; body: string };
    expect(notice.roomId).toBe("");
    expect(notice.url).toBe("/messages");
    expect(notice.url).not.toContain("pickUp");
    expect(notice.body).not.toContain("Answer");
    expect(friendPostAlertRecipients({ authorUserId: authorId, visibility: "public" })).toContain(fanId);
    expect(friendPostAlertRecipients({ authorUserId: authorId, visibility: "members" })).not.toContain(fanId);
    startPaidChannelSubscription({ subscriberUserId: fanId, creatorUserId: authorId });
    expect(friendPostAlertRecipients({ authorUserId: authorId, visibility: "members" })).toContain(fanId);
  });
});
