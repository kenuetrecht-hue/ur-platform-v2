import { describe, expect, it, beforeEach } from "vitest";
import {
  cancelPaidChannelSubscription,
  followCreatorChannel,
  getCreatorAudienceCounts,
  getCreatorAudienceLedger,
  getQualifyingFoundingAudienceCounts,
  grantAudienceRelationshipsForTests,
  startPaidChannelSubscription,
  unfollowCreatorChannel,
  _resetCreatorAudienceForTests,
} from "../server/_core/creator-audience-service";

describe("creator audience ledger", () => {
  beforeEach(() => {
    _resetCreatorAudienceForTests();
  });

  it("counts follows and paid subscriptions from fan actions only", () => {
    followCreatorChannel({ followerUserId: "fan-a", creatorUserId: "creator-1" });
    followCreatorChannel({ followerUserId: "fan-b", creatorUserId: "creator-1" });
    startPaidChannelSubscription({ subscriberUserId: "fan-a", creatorUserId: "creator-1" });

    expect(getCreatorAudienceCounts("creator-1")).toEqual({
      followerCount: 2,
      paidSubscriberCount: 1,
      freeFollowerCount: 1,
      uniquePeopleCount: 2,
    });
  });

  it("does not let a second follow from the same fan double-count", () => {
    followCreatorChannel({ followerUserId: "fan-a", creatorUserId: "creator-1" });
    followCreatorChannel({ followerUserId: "fan-a", creatorUserId: "creator-1" });
    expect(getCreatorAudienceCounts("creator-1").followerCount).toBe(1);
  });

  it("drops a follower only when that fan unfollows", () => {
    followCreatorChannel({ followerUserId: "fan-a", creatorUserId: "creator-1" });
    followCreatorChannel({ followerUserId: "fan-b", creatorUserId: "creator-1" });
    unfollowCreatorChannel({ followerUserId: "fan-a", creatorUserId: "creator-1" });
    expect(getCreatorAudienceCounts("creator-1").followerCount).toBe(1);
  });

  it("requires canceling a paid subscription before that fan can unfollow", () => {
    startPaidChannelSubscription({ subscriberUserId: "fan-a", creatorUserId: "creator-1" });
    expect(() =>
      unfollowCreatorChannel({ followerUserId: "fan-a", creatorUserId: "creator-1" }),
    ).toThrow(/paid subscription/i);
    cancelPaidChannelSubscription({ subscriberUserId: "fan-a", creatorUserId: "creator-1" });
    expect(unfollowCreatorChannel({ followerUserId: "fan-a", creatorUserId: "creator-1" })).toBe(true);
    expect(getCreatorAudienceCounts("creator-1")).toEqual({
      followerCount: 0,
      paidSubscriberCount: 0,
      freeFollowerCount: 0,
      uniquePeopleCount: 0,
    });
  });

  it("lists each fan so the creator cannot invent a count", () => {
    followCreatorChannel({ followerUserId: "fan-a", creatorUserId: "creator-1" });
    startPaidChannelSubscription({ subscriberUserId: "fan-b", creatorUserId: "creator-1" });
    const ledger = getCreatorAudienceLedger("creator-1");
    expect(ledger.followers.map((f) => f.userId).sort()).toEqual(["fan-a", "fan-b"]);
    expect(ledger.paidSubscribers.map((s) => s.userId)).toEqual(["fan-b"]);
  });

  it("counts a paid subscriber as a different person from a free follower", () => {
    followCreatorChannel({ followerUserId: "fan-free", creatorUserId: "creator-1" });
    startPaidChannelSubscription({ subscriberUserId: "fan-paid", creatorUserId: "creator-1" });
    const live = getCreatorAudienceCounts("creator-1");
    expect(live.freeFollowerCount).toBe(1);
    expect(live.paidSubscriberCount).toBe(1);
    expect(live.uniquePeopleCount).toBe(2);
    const qualifying = getQualifyingFoundingAudienceCounts(
      "creator-1",
      new Date("2099-01-01T00:00:00.000Z"),
    );
    expect(qualifying.freeFollowerCount).toBe(1);
    expect(qualifying.paidSubscriberCount).toBe(1);
    expect(qualifying.uniquePeopleCount).toBe(2);
    expect(qualifying.twoThousandReachedAt).toBeNull();
    expect(qualifying.fourThousandReachedAt).toBeNull();
  });

  it("records when the 2,000 and 4,000 founding-audience milestones are reached", () => {
    const firstWave = new Date("2026-08-15T12:00:00.000Z");
    const secondWave = new Date("2026-08-25T12:00:00.000Z");
    grantAudienceRelationshipsForTests({
      creatorUserId: "creator-1",
      followerCount: 1000,
      paidSubscriberCount: 1000,
      at: firstWave,
    });
    expect(getQualifyingFoundingAudienceCounts("creator-1", new Date("2099-01-01T00:00:00.000Z"))).toMatchObject({
      uniquePeopleCount: 2000,
      twoThousandReachedAt: firstWave.toISOString(),
      fourThousandReachedAt: null,
    });
    grantAudienceRelationshipsForTests({
      creatorUserId: "creator-1",
      followerCount: 1000,
      paidSubscriberCount: 1000,
      at: secondWave,
      startFollowerIndex: 1000,
      startPaidIndex: 1000,
    });
    expect(getQualifyingFoundingAudienceCounts("creator-1", new Date("2099-01-01T00:00:00.000Z"))).toMatchObject({
      uniquePeopleCount: 4000,
      twoThousandReachedAt: firstWave.toISOString(),
      fourThousandReachedAt: secondWave.toISOString(),
    });
  });

  it("blocks following yourself", () => {
    expect(() =>
      followCreatorChannel({ followerUserId: "creator-1", creatorUserId: "creator-1" }),
    ).toThrow(/yourself/i);
  });
});
