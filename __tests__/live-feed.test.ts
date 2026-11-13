import { describe, expect, it, beforeEach } from "vitest";
import {
  LIVE_FEED_MAX_COHOSTS,
  _resetLiveFeedsForTests,
  createCoHostInvite,
  enterLiveFeed,
  grantLiveFeedTicket,
  redeemCoHostInvite,
  startLiveFeed,
} from "../server/_core/live-feed-service";

describe("live feeds", () => {
  beforeEach(() => {
    _resetLiveFeedsForTests();
  });

  it("lets any member into a free live feed", () => {
    const feed = startLiveFeed({
      hostUserId: "host-1",
      hostName: "Host",
      title: "Open room",
      access: "free",
    });
    const viewer = enterLiveFeed({ feedId: feed.id, userId: "member-1", name: "Member" });
    expect(viewer.canWatch).toBe(true);
    expect(viewer.needsPayment).toBe(false);
    expect(viewer.feed.priceCents).toBe(0);
  });

  it("keeps a paid live feed closed until the ticket is paid", () => {
    const feed = startLiveFeed({
      hostUserId: "host-1",
      hostName: "Host",
      title: "Private room",
      access: "paid",
      priceCents: 500,
    });
    const blocked = enterLiveFeed({ feedId: feed.id, userId: "member-1", name: "Member" });
    expect(blocked.canWatch).toBe(false);
    expect(blocked.needsPayment).toBe(true);
    expect(grantLiveFeedTicket({ feedId: feed.id, userId: "member-1", priceCents: 100 })).toBe(false);
    expect(grantLiveFeedTicket({ feedId: feed.id, userId: "member-1", priceCents: 500 })).toBe(true);
    const inside = enterLiveFeed({ feedId: feed.id, userId: "member-1", name: "Member" });
    expect(inside.canWatch).toBe(true);
  });

  it("lets four co-hosts into a paid feed and refuses a fifth", () => {
    const feed = startLiveFeed({
      hostUserId: "host-1",
      hostName: "Host",
      title: "Interview",
      access: "paid",
      priceCents: 500,
    });
    for (let i = 0; i < LIVE_FEED_MAX_COHOSTS; i += 1) {
      const invite = createCoHostInvite({ feedId: feed.id, hostUserId: "host-1" });
      const joined = redeemCoHostInvite({ token: invite.token, userId: `guest-${i}`, name: `Guest ${i}` });
      expect(joined.role).toBe("cohost");
      expect(enterLiveFeed({ feedId: feed.id, userId: `guest-${i}`, name: `Guest ${i}` }).canWatch).toBe(true);
    }
    expect(() => createCoHostInvite({ feedId: feed.id, hostUserId: "host-1" })).toThrow(/4 co-hosts/);
    const stranger = enterLiveFeed({ feedId: feed.id, userId: "stranger", name: "Stranger" });
    expect(stranger.canWatch).toBe(false);
  });
});
