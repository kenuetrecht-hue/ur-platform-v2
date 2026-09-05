import { describe, expect, it } from "vitest";
import {
  FOUNDING_AUDIENCE_BOOST_FEE_DISCOUNT_PERCENT,
  FOUNDING_AUDIENCE_FEE_DISCOUNT_PERCENT,
  foundingAudienceCreatorSaleShare,
  foundingAudienceYearEndsAt,
  launchAdvantageEndsAt,
  launchHundredBandFromSlot,
  meetsFoundingAudienceBoostThresholds,
  meetsFoundingAudienceThresholds,
  resolveFoundingAudienceYear,
} from "../lib/founding-audience-year-discount";
import { getLaunchDate, getLaunchWindowEnd } from "../lib/launch-promotion-config";

const LAUNCH = getLaunchDate();
const IN_WINDOW = new Date(LAUNCH.getTime() + 2 * 24 * 60 * 60 * 1000);
const AFTER_WINDOW = new Date(getLaunchWindowEnd(LAUNCH).getTime() + 24 * 60 * 60 * 1000);

describe("founding audience year discount", () => {
  it("maps first, second, and third hundred", () => {
    expect(launchHundredBandFromSlot(1)).toBe(1);
    expect(launchHundredBandFromSlot(100)).toBe(1);
    expect(launchHundredBandFromSlot(101)).toBe(2);
    expect(launchHundredBandFromSlot(200)).toBe(2);
    expect(launchHundredBandFromSlot(201)).toBe(3);
    expect(launchHundredBandFromSlot(300)).toBe(3);
    expect(launchHundredBandFromSlot(301)).toBe(null);
  });

  it("requires 1,000 followers and 1,000 paid subscribers as 2,000 different people", () => {
    expect(
      meetsFoundingAudienceThresholds({
        broughtFollowerCount: 999,
        paidChannelSubscriberCount: 1000,
      }),
    ).toBe(false);
    expect(
      meetsFoundingAudienceThresholds({
        broughtFollowerCount: 2000,
        paidChannelSubscriberCount: 0,
      }),
    ).toBe(false);
    expect(
      meetsFoundingAudienceThresholds({
        broughtFollowerCount: 1000,
        paidChannelSubscriberCount: 1000,
      }),
    ).toBe(true);
  });

  it("requires 2,000 followers and 2,000 paid subscribers as 4,000 different people for 60%", () => {
    expect(
      meetsFoundingAudienceBoostThresholds({
        broughtFollowerCount: 1999,
        paidChannelSubscriberCount: 2000,
      }),
    ).toBe(false);
    expect(
      meetsFoundingAudienceBoostThresholds({
        broughtFollowerCount: 4000,
        paidChannelSubscriberCount: 0,
      }),
    ).toBe(false);
    expect(
      meetsFoundingAudienceBoostThresholds({
        broughtFollowerCount: 1000,
        paidChannelSubscriberCount: 1000,
      }),
    ).toBe(false);
    expect(
      meetsFoundingAudienceBoostThresholds({
        broughtFollowerCount: 2000,
        paidChannelSubscriberCount: 2000,
      }),
    ).toBe(true);
    expect(FOUNDING_AUDIENCE_BOOST_FEE_DISCOUNT_PERCENT).toBe(60);
    expect(foundingAudienceCreatorSaleShare(60)).toBe(0.94);
  });

  it("does not start the year until a first-hundred launch deal ends", () => {
    const enrolledAt = IN_WINDOW;
    const duringLaunchDeal = new Date(enrolledAt.getTime() + 10 * 24 * 60 * 60 * 1000);
    const afterLaunchDeal = new Date(launchAdvantageEndsAt({ enrolledAt, launchSlot: 12 }).getTime() + 1);

    const waiting = resolveFoundingAudienceYear({
      enrolledAt,
      launchSlot: 12,
      broughtFollowerCount: 1000,
      paidChannelSubscriberCount: 1000,
      verified: true,
      launchDate: LAUNCH,
      now: duringLaunchDeal,
    });
    expect(waiting.joinedInWindow).toBe(true);
    expect(waiting.active).toBe(false);
    expect(waiting.waitingOnLaunchAdvantage).toBe(true);
    expect(waiting.launchBand).toBe(1);
    expect(waiting.summary).toMatch(/first hundred/i);

    const live = resolveFoundingAudienceYear({
      enrolledAt,
      launchSlot: 12,
      broughtFollowerCount: 1000,
      paidChannelSubscriberCount: 1000,
      verified: true,
      launchDate: LAUNCH,
      now: afterLaunchDeal,
    });
    expect(live.active).toBe(true);
    expect(live.platformFeePercent).toBe(7.5);
    expect(live.creatorKeepPercent).toBe(92.5);
    expect(live.yearEndsAt).toBe(
      foundingAudienceYearEndsAt({ enrolledAt, launchSlot: 12 }).toISOString(),
    );
    expect(FOUNDING_AUDIENCE_FEE_DISCOUNT_PERCENT).toBe(50);
    expect(foundingAudienceCreatorSaleShare()).toBe(0.925);

    const afterFirstYear = new Date(
      foundingAudienceYearEndsAt({ enrolledAt, launchSlot: 12 }).getTime() + 1,
    );
    const expired = resolveFoundingAudienceYear({
      enrolledAt,
      launchSlot: 12,
      broughtFollowerCount: 1000,
      paidChannelSubscriberCount: 1000,
      verified: true,
      launchDate: LAUNCH,
      now: afterFirstYear,
    });
    expect(expired.active).toBe(false);
  });

  it("gives creators after slot 300 the 50% for the whole first year", () => {
    const enrolledAt = IN_WINDOW;
    const status = resolveFoundingAudienceYear({
      enrolledAt,
      launchSlot: 301,
      broughtFollowerCount: 1000,
      paidChannelSubscriberCount: 1000,
      verified: true,
      launchDate: LAUNCH,
      now: enrolledAt,
    });
    expect(status.launchBand).toBe(null);
    expect(status.waitingOnLaunchAdvantage).toBe(false);
    expect(status.active).toBe(true);
    expect(status.yearStartsAt).toBe(enrolledAt.toISOString());
    expect(status.yearEndsAt).toBe(
      foundingAudienceYearEndsAt({ enrolledAt, launchSlot: 301 }).toISOString(),
    );
    expect(status.feeDiscountPercent).toBe(50);
    expect(status.meetsBoostAudience).toBe(false);
  });

  it("starts the after-300 year at the moment they hit 2,000, then upgrades to 60% without restarting", () => {
    const enrolledAt = IN_WINDOW;
    const hitTwoThousand = new Date(enrolledAt.getTime() + 5 * 24 * 60 * 60 * 1000);
    const hitFourThousand = new Date(enrolledAt.getTime() + 15 * 24 * 60 * 60 * 1000);
    const yearEnd = foundingAudienceYearEndsAt({
      enrolledAt,
      launchSlot: 301,
      twoThousandReachedAt: hitTwoThousand,
    });

    const atTwoK = resolveFoundingAudienceYear({
      enrolledAt,
      launchSlot: 301,
      broughtFollowerCount: 1000,
      paidChannelSubscriberCount: 1000,
      verified: true,
      launchDate: LAUNCH,
      now: hitTwoThousand,
      twoThousandReachedAt: hitTwoThousand,
    });
    expect(atTwoK.active).toBe(true);
    expect(atTwoK.feeDiscountPercent).toBe(50);
    expect(atTwoK.platformFeePercent).toBe(7.5);
    expect(atTwoK.yearStartsAt).toBe(hitTwoThousand.toISOString());
    expect(atTwoK.yearEndsAt).toBe(yearEnd.toISOString());

    const atFourK = resolveFoundingAudienceYear({
      enrolledAt,
      launchSlot: 301,
      broughtFollowerCount: 2000,
      paidChannelSubscriberCount: 2000,
      verified: true,
      launchDate: LAUNCH,
      now: hitFourThousand,
      twoThousandReachedAt: hitTwoThousand,
    });
    expect(atFourK.active).toBe(true);
    expect(atFourK.meetsBoostAudience).toBe(true);
    expect(atFourK.feeDiscountPercent).toBe(60);
    expect(atFourK.platformFeePercent).toBe(6);
    expect(atFourK.creatorKeepPercent).toBe(94);
    expect(atFourK.yearStartsAt).toBe(hitTwoThousand.toISOString());
    expect(atFourK.yearEndsAt).toBe(yearEnd.toISOString());
  });

  it("gives the first 300 a full year of 60% after the launch deal if they hit 4,000 in 30 days", () => {
    const enrolledAt = IN_WINDOW;
    const duringDeal = new Date(enrolledAt.getTime() + 10 * 24 * 60 * 60 * 1000);
    const afterDeal = new Date(launchAdvantageEndsAt({ enrolledAt, launchSlot: 12 }).getTime() + 1);

    const waiting = resolveFoundingAudienceYear({
      enrolledAt,
      launchSlot: 12,
      broughtFollowerCount: 2000,
      paidChannelSubscriberCount: 2000,
      verified: true,
      launchDate: LAUNCH,
      now: duringDeal,
    });
    expect(waiting.active).toBe(false);
    expect(waiting.waitingOnLaunchAdvantage).toBe(true);
    expect(waiting.meetsBoostAudience).toBe(true);
    expect(waiting.summary).toMatch(/60%/);

    const live = resolveFoundingAudienceYear({
      enrolledAt,
      launchSlot: 12,
      broughtFollowerCount: 2000,
      paidChannelSubscriberCount: 2000,
      verified: true,
      launchDate: LAUNCH,
      now: afterDeal,
    });
    expect(live.active).toBe(true);
    expect(live.feeDiscountPercent).toBe(60);
    expect(live.platformFeePercent).toBe(6);
    expect(live.creatorKeepPercent).toBe(94);
    expect(live.yearStartsAt).toBe(
      launchAdvantageEndsAt({ enrolledAt, launchSlot: 12 }).toISOString(),
    );
    expect(live.yearEndsAt).toBe(
      foundingAudienceYearEndsAt({ enrolledAt, launchSlot: 12 }).toISOString(),
    );
  });

  it("gives the first hundred six months, then a full year of 50%", () => {
    const enrolledAt = IN_WINDOW;
    const afterSixMonths = launchAdvantageEndsAt({ enrolledAt, launchSlot: 1 });
    const sixMonthsPlusYear = foundingAudienceYearEndsAt({ enrolledAt, launchSlot: 1 });
    expect(sixMonthsPlusYear.getTime() - afterSixMonths.getTime()).toBe(365 * 24 * 60 * 60 * 1000);
  });

  it("waits for second and third hundred the same way", () => {
    const enrolledAt = IN_WINDOW;
    const secondStillWaiting = resolveFoundingAudienceYear({
      enrolledAt,
      launchSlot: 150,
      broughtFollowerCount: 1000,
      paidChannelSubscriberCount: 1000,
      verified: true,
      launchDate: LAUNCH,
      now: new Date(enrolledAt.getTime() + 20 * 24 * 60 * 60 * 1000),
    });
    expect(secondStillWaiting.waitingOnLaunchAdvantage).toBe(true);
    expect(secondStillWaiting.launchBand).toBe(2);

    const thirdLive = resolveFoundingAudienceYear({
      enrolledAt,
      launchSlot: 250,
      broughtFollowerCount: 1000,
      paidChannelSubscriberCount: 1000,
      verified: true,
      launchDate: LAUNCH,
      now: new Date(enrolledAt.getTime() + 31 * 24 * 60 * 60 * 1000),
    });
    expect(thirdLive.launchBand).toBe(3);
    expect(thirdLive.active).toBe(true);
  });

  it("rejects creators who join after the 30-day window", () => {
    const status = resolveFoundingAudienceYear({
      enrolledAt: AFTER_WINDOW,
      launchSlot: null,
      broughtFollowerCount: 5000,
      paidChannelSubscriberCount: 5000,
      verified: true,
      launchDate: LAUNCH,
      now: AFTER_WINDOW,
    });
    expect(status.joinedInWindow).toBe(false);
    expect(status.active).toBe(false);
  });
});
