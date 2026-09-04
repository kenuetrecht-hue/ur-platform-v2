import { describe, expect, it } from "vitest";
import {
  AFFILIATE_PAYOUT_AFTER_QUALIFYING_TRANSACTIONS,
  AFFILIATE_REFERRAL_PAYOUT_RULE,
  canPayAffiliateReferralBonus,
  creatorJoinedDuringLaunchWindow,
  describeAffiliateReferralProgress,
  remainingQualifyingTransactions,
  resolveCreatorFreeServiceEnd,
  shouldCountTowardAffiliatePayout,
} from "../lib/affiliate-referral-payout-policy";

const LAUNCH = new Date("2026-08-12T05:00:00.000Z");

describe("affiliate $5 referral payout policy", () => {
  it("states the 30-day, 24-hour, then five-transaction rule up front", () => {
    expect(AFFILIATE_REFERRAL_PAYOUT_RULE).toMatch(/\$5\.00/i);
    expect(AFFILIATE_REFERRAL_PAYOUT_RULE).toMatch(/24 hours/i);
    expect(AFFILIATE_REFERRAL_PAYOUT_RULE).toMatch(/five transactions/i);
    expect(AFFILIATE_REFERRAL_PAYOUT_RULE).toMatch(/first 30 days/i);
    expect(AFFILIATE_REFERRAL_PAYOUT_RULE).toMatch(/do not count/i);
    expect(AFFILIATE_PAYOUT_AFTER_QUALIFYING_TRANSACTIONS).toBe(5);
  });

  it("gives a 24-hour free window to people who join during the 30-day launch", () => {
    const enrolledAt = new Date("2026-09-04T12:00:00.000Z");
    expect(creatorJoinedDuringLaunchWindow({ enrolledAt, launchDate: LAUNCH })).toBe(true);
    const end = resolveCreatorFreeServiceEnd({ enrolledAt, launchDate: LAUNCH });
    expect(end?.toISOString()).toBe("2026-09-05T12:00:00.000Z");
  });

  it("does not give a free window after the 30-day launch closes", () => {
    const enrolledAt = new Date("2026-10-01T12:00:00.000Z");
    expect(creatorJoinedDuringLaunchWindow({ enrolledAt, launchDate: LAUNCH })).toBe(false);
    expect(resolveCreatorFreeServiceEnd({ enrolledAt, launchDate: LAUNCH })).toBeNull();
  });

  it("does not count sales during the free 24 hours toward the five", () => {
    const freeServiceEndsAt = new Date("2026-09-05T12:00:00.000Z");
    expect(
      shouldCountTowardAffiliatePayout({
        freeServiceEndsAt,
        transactionAt: new Date("2026-09-05T11:59:59.000Z"),
      }),
    ).toBe(false);
    expect(
      shouldCountTowardAffiliatePayout({
        freeServiceEndsAt,
        transactionAt: new Date("2026-09-05T12:00:00.000Z"),
      }),
    ).toBe(true);
  });

  it("will not pay $5 until the free day is over and five later sales exist", () => {
    const freeServiceEndsAt = new Date("2026-09-05T12:00:00.000Z");
    expect(
      canPayAffiliateReferralBonus({
        alreadyPaid: false,
        freeServiceEndsAt,
        qualifyingTransactionCount: 5,
        now: new Date("2026-09-05T11:00:00.000Z"),
      }),
    ).toBe(false);
    expect(
      canPayAffiliateReferralBonus({
        alreadyPaid: false,
        freeServiceEndsAt,
        qualifyingTransactionCount: 4,
        now: new Date("2026-09-06T12:00:00.000Z"),
      }),
    ).toBe(false);
    expect(
      canPayAffiliateReferralBonus({
        alreadyPaid: false,
        freeServiceEndsAt,
        qualifyingTransactionCount: 5,
        now: new Date("2026-09-06T12:00:00.000Z"),
      }),
    ).toBe(true);
  });

  it("tells people they are still in the free 24 hours", () => {
    const text = describeAffiliateReferralProgress({
      freeServiceEndsAt: new Date("2026-09-05T12:00:00.000Z"),
      now: new Date("2026-09-04T18:00:00.000Z"),
      qualifyingTransactionCount: 3,
      bonusPaid: false,
    });
    expect(text).toMatch(/24 free hours/i);
    expect(text).toMatch(/do not count/i);
    expect(remainingQualifyingTransactions(2)).toBe(3);
  });
});
