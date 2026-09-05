import { describe, expect, it } from "vitest";
import {
  FOUNDING_AUDIENCE_FEE_DISCOUNT_PERCENT,
  foundingAudienceCreatorSaleShare,
  foundingAudienceYearEndsAt,
  launchAdvantageEndsAt,
  launchHundredBandFromSlot,
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
