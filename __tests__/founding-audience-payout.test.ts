import { describe, expect, it, beforeEach } from "vitest";
import {
  completeUpholdConnection,
  getCreatorSaleShare,
  processInstantCreatorPayout,
} from "../server/_core/creator-payout-service";
import {
  _resetPartnerProgramForTests,
  _setNextLaunchSlotForTests,
  enrollContentCreator,
  getCreatorDashboard,
  getOwnerCreatorRoster,
} from "../server/_core/partner-program-service";
import {
  cancelPaidChannelSubscription,
  followCreatorChannel,
  grantAudienceRelationshipsForTests,
  startPaidChannelSubscription,
  unfollowCreatorChannel,
} from "../server/_core/creator-audience-service";
import { getLaunchDate, getLaunchWindowEnd } from "../lib/launch-promotion-config";
import { launchAdvantageEndsAt } from "../lib/founding-audience-year-discount";

const LAUNCH = getLaunchDate();
const IN_WINDOW = new Date(LAUNCH.getTime() + 2 * 24 * 60 * 60 * 1000);
const AFTER_WINDOW = new Date(getLaunchWindowEnd(LAUNCH).getTime() + 24 * 60 * 60 * 1000);

describe("founding audience payout wiring", () => {
  beforeEach(() => {
    _resetPartnerProgramForTests();
  });

  it("second-hundred launch deal stays 94% until it ends, then the year is 92.5%", () => {
    _setNextLaunchSlotForTests(150);
    enrollContentCreator({
      userId: "fa-tier2",
      userEmail: "tier2@test.com",
      displayName: "Second Hundred",
      enrolledAt: IN_WINDOW,
      launchDate: LAUNCH,
    });
    grantAudienceRelationshipsForTests({
      creatorUserId: "fa-tier2",
      followerCount: 1000,
      paidSubscriberCount: 1000,
      at: IN_WINDOW,
    });

    const duringDeal = new Date(IN_WINDOW.getTime() + 20 * 24 * 60 * 60 * 1000);
    const afterDeal = new Date(launchAdvantageEndsAt({ enrolledAt: IN_WINDOW, launchSlot: 150 }).getTime() + 1);

    expect(getCreatorSaleShare("fa-tier2", duringDeal)).toBeCloseTo(0.94, 5);
    expect(getCreatorSaleShare("fa-tier2", afterDeal)).toBeCloseTo(0.925, 5);

    const dash = getCreatorDashboard("fa-tier2");
    expect(dash.enrolled).toBe(true);
    if (dash.enrolled) {
      expect(dash.audience.followerCount).toBeGreaterThanOrEqual(1000);
      expect(dash.audience.paidSubscriberCount).toBe(1000);
      expect(dash.foundingAudience?.waitingOnLaunchAdvantage).toBe(true);
      expect(dash.foundingAudience?.launchBand).toBe(2);
      expect(dash.foundingAudienceRule).toMatch(/full year of 50%/i);
    }
  });

  it("first-hundred year does not start until the 180-day advantage ends", () => {
    enrollContentCreator({
      userId: "fa-tier1",
      userEmail: "tier1@test.com",
      displayName: "First Hundred",
      enrolledAt: IN_WINDOW,
      launchDate: LAUNCH,
    });
    grantAudienceRelationshipsForTests({
      creatorUserId: "fa-tier1",
      followerCount: 1000,
      paidSubscriberCount: 1000,
      at: IN_WINDOW,
    });
    const dash = getCreatorDashboard("fa-tier1");
    expect(dash.enrolled).toBe(true);
    if (dash.enrolled) {
      expect(dash.foundingAudience?.active).toBe(false);
      expect(dash.foundingAudience?.waitingOnLaunchAdvantage).toBe(true);
      expect(dash.foundingAudience?.yearStartsAt).toBe(
        launchAdvantageEndsAt({ enrolledAt: IN_WINDOW, launchSlot: 1 }).toISOString(),
      );
    }

    const duringDeal = new Date(IN_WINDOW.getTime() + 10 * 24 * 60 * 60 * 1000);
    expect(getCreatorSaleShare("fa-tier1", duringDeal)).toBeCloseTo(0.925, 5);
  });

  it("pays 92.5% after a first-hundred advantage that already ended", () => {
    const enrolledAt = new Date("2026-03-01T00:00:00.000Z");
    enrollContentCreator({
      userId: "fa-paid",
      userEmail: "paid@test.com",
      displayName: "Year Live",
      enrolledAt,
      launchDate: LAUNCH,
    });
    grantAudienceRelationshipsForTests({
      creatorUserId: "fa-paid",
      followerCount: 1000,
      paidSubscriberCount: 1000,
      at: IN_WINDOW,
    });
    completeUpholdConnection({
      userId: "fa-paid",
      upholdEmail: "year@uphold.com",
    });

    const afterDeal = new Date(launchAdvantageEndsAt({ enrolledAt, launchSlot: 1 }).getTime() + 1);
    expect(getCreatorSaleShare("fa-paid", afterDeal)).toBeCloseTo(0.925, 5);

    const tx = processInstantCreatorPayout({
      creatorUserId: "fa-paid",
      grossCents: 2000,
      now: afterDeal,
    });
    expect(tx?.netCents).toBe(Math.round(2000 * 0.925));
    expect(tx?.platformFeeCents).toBe(2000 - Math.round(2000 * 0.925));
  });

  it("does not apply the year offer after the 30-day window even with a live audience", () => {
    enrollContentCreator({
      userId: "fa-late",
      userEmail: "late@test.com",
      displayName: "Too Late",
      enrolledAt: AFTER_WINDOW,
      launchDate: LAUNCH,
    });
    grantAudienceRelationshipsForTests({
      creatorUserId: "fa-late",
      followerCount: 1000,
      paidSubscriberCount: 1000,
      at: AFTER_WINDOW,
    });
    expect(getCreatorSaleShare("fa-late", AFTER_WINDOW)).toBe(0.85);
  });

  it("does not let the same 1,000 people count as both followers and paid subscribers", () => {
    enrollContentCreator({
      userId: "fa-overlap",
      userEmail: "overlap@test.com",
      displayName: "Overlap",
      enrolledAt: IN_WINDOW,
      launchDate: LAUNCH,
    });
    grantAudienceRelationshipsForTests({
      creatorUserId: "fa-overlap",
      followerCount: 0,
      paidSubscriberCount: 1000,
      at: IN_WINDOW,
    });
    const dash = getCreatorDashboard("fa-overlap");
    expect(dash.enrolled).toBe(true);
    if (dash.enrolled) {
      expect(dash.audience.qualifying.uniquePeopleCount).toBe(1000);
      expect(dash.foundingAudience?.meetsAudience).toBe(false);
    }
  });

  it("lets the owner see every creator and live counts; only the fan can lower a count", () => {
    enrollContentCreator({
      userId: "fa-review",
      userEmail: "review@test.com",
      displayName: "Review Me",
      enrolledAt: IN_WINDOW,
      launchDate: LAUNCH,
    });
    followCreatorChannel({ followerUserId: "fan-1", creatorUserId: "fa-review" });
    followCreatorChannel({ followerUserId: "fan-2", creatorUserId: "fa-review" });
    startPaidChannelSubscription({ subscriberUserId: "fan-paid", creatorUserId: "fa-review" });

    const roster = getOwnerCreatorRoster();
    expect(roster.creatorCount).toBe(1);
    expect(roster.totalFollowers).toBe(3);
    expect(roster.totalPaidSubscribers).toBe(1);
    expect(roster.creators[0]?.displayName).toBe("Review Me");
    expect(roster.creators[0]?.userEmail).toBe("review@test.com");
    expect(roster.creators[0]?.followerCount).toBe(3);
    expect(roster.creators[0]?.paidSubscriberCount).toBe(1);
    expect(roster.creators[0]?.followers.map((f) => f.userId)).toEqual(
      expect.arrayContaining(["fan-1", "fan-2", "fan-paid"]),
    );
    expect(roster.creators[0]?.paidSubscribers.map((s) => s.userId)).toEqual(["fan-paid"]);

    unfollowCreatorChannel({ followerUserId: "fan-1", creatorUserId: "fa-review" });
    expect(getOwnerCreatorRoster().creators[0]?.followerCount).toBe(2);

    cancelPaidChannelSubscription({
      subscriberUserId: "fan-paid",
      creatorUserId: "fa-review",
    });
    expect(getOwnerCreatorRoster().creators[0]?.paidSubscriberCount).toBe(0);
  });
});
