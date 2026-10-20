import { describe, expect, it, beforeEach } from "vitest";
import {
  applyBetaBasicDiscountCents,
  qualifiesForBetaBasicDiscount,
  BETA_BASIC_DISCOUNT_PERCENT,
} from "../lib/beta-test-offer";
import { getBetaStart, getLaunchDate, launchFeeKeepOn100 } from "../lib/launch-promotion-config";
import { getCreatorSaleShare } from "../server/_core/creator-payout-service";
import {
  _resetPartnerProgramForTests,
  _setNextLaunchSlotForTests,
  enrollContentCreator,
} from "../server/_core/partner-program-service";

const LAUNCH = getLaunchDate();
const DURING_BETA = new Date(getBetaStart().getTime() + 24 * 60 * 60 * 1000);
const BEFORE_BETA = new Date(getBetaStart().getTime() - 24 * 60 * 60 * 1000);
const AFTER_LAUNCH = new Date(LAUNCH.getTime() + 2 * 24 * 60 * 60 * 1000);

describe("beta test offer", () => {
  beforeEach(() => {
    _resetPartnerProgramForTests();
  });

  it("keeps UR profitable on the creator deal and the basic discount", () => {
    expect(BETA_BASIC_DISCOUNT_PERCENT).toBe(10);
    expect(launchFeeKeepOn100(50)).toEqual({ youKeep: "$92.50", urKeeps: "$7.50" });
    expect(applyBetaBasicDiscountCents(799)).toBe(719);
    expect(applyBetaBasicDiscountCents(199)).toBe(179);
    expect(applyBetaBasicDiscountCents(556)).not.toBe(500);
  });

  it("gives the 10% price only to a basic member who joined during beta, and only until launch day", () => {
    expect(qualifiesForBetaBasicDiscount(DURING_BETA, DURING_BETA)).toBe(true);
    expect(qualifiesForBetaBasicDiscount(BEFORE_BETA, DURING_BETA)).toBe(false);
    expect(qualifiesForBetaBasicDiscount(DURING_BETA, AFTER_LAUNCH)).toBe(false);
    expect(qualifiesForBetaBasicDiscount(AFTER_LAUNCH, AFTER_LAUNCH)).toBe(false);
  });

  it("puts a creator who joins during beta in the first hundred even past slot 100", () => {
    _setNextLaunchSlotForTests(150);
    enrollContentCreator({
      userId: "beta-creator",
      userEmail: "beta-creator@test.com",
      displayName: "Beta Creator",
      enrolledAt: DURING_BETA,
      launchDate: LAUNCH,
    });
    expect(getCreatorSaleShare("beta-creator", DURING_BETA)).toBeCloseTo(0.925, 5);
  });

  it("keeps the second hundred at 94% when they join after launch day", () => {
    _setNextLaunchSlotForTests(150);
    enrollContentCreator({
      userId: "after-launch",
      userEmail: "after-launch@test.com",
      displayName: "After Launch",
      enrolledAt: AFTER_LAUNCH,
      launchDate: LAUNCH,
    });
    expect(getCreatorSaleShare("after-launch", AFTER_LAUNCH)).toBeCloseTo(0.94, 5);
  });
});
