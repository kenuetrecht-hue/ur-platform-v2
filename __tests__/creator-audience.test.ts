import { describe, expect, it, beforeEach } from "vitest";
import {
  cancelPaidChannelSubscription,
  followCreatorChannel,
  getCreatorAudienceCounts,
  getCreatorAudienceLedger,
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
    });
  });

  it("lists each fan so the creator cannot invent a count", () => {
    followCreatorChannel({ followerUserId: "fan-a", creatorUserId: "creator-1" });
    startPaidChannelSubscription({ subscriberUserId: "fan-b", creatorUserId: "creator-1" });
    const ledger = getCreatorAudienceLedger("creator-1");
    expect(ledger.followers.map((f) => f.userId).sort()).toEqual(["fan-a", "fan-b"]);
    expect(ledger.paidSubscribers.map((s) => s.userId)).toEqual(["fan-b"]);
  });

  it("blocks following yourself", () => {
    expect(() =>
      followCreatorChannel({ followerUserId: "creator-1", creatorUserId: "creator-1" }),
    ).toThrow(/yourself/i);
  });
});
