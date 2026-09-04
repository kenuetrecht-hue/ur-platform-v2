import { describe, it, expect } from "vitest";
import {
  enrollAffiliate,
  enrollContentCreator,
  recordCreatorTransaction,
  getAffiliateDashboard,
  AFFILIATE_BONUS_CENTS,
  AFFILIATE_PAYOUT_AFTER_TRANSACTIONS,
} from "../server/_core/partner-program-service";

const LAUNCH = new Date("2026-08-12T05:00:00.000Z");
const DURING_LAUNCH = new Date("2026-09-04T12:00:00.000Z");
const DURING_FREE_DAY = new Date("2026-09-04T18:00:00.000Z");
const AFTER_FREE_DAY = new Date("2026-09-05T13:00:00.000Z");

describe("Partner program — affiliate & creator dashboards", () => {
  it("affiliate gets referral code and the $5-after-24h-then-5 rule", () => {
    const affiliate = enrollAffiliate({
      userId: "aff-rule-1",
      userEmail: "aff-rule@test.com",
      displayName: "Pat",
    });
    expect(affiliate.referralCode.length).toBeGreaterThan(3);
    const dash = getAffiliateDashboard("aff-rule-1");
    expect(dash.enrolled).toBe(true);
    if (dash.enrolled) {
      expect(dash.referralLink).toContain(affiliate.customSlug);
      expect(dash.bonusPerCreatorUsd).toBe("5.00");
      expect(dash.payoutAfterTransactions).toBe(5);
      expect(dash.payoutRule).toMatch(/24 hours/i);
      expect(dash.payoutRule).toMatch(/five transactions/i);
    }
  });

  it("does not pay $5 for five sales during the creator's free 24 hours", () => {
    const affiliate = enrollAffiliate({
      userId: "aff-free-1",
      userEmail: "aff-free@test.com",
      displayName: "Referrer",
    });
    enrollContentCreator({
      userId: "creator-free-1",
      userEmail: "creator-free@test.com",
      displayName: "New Creator",
      referralCode: affiliate.referralCode,
      enrolledAt: DURING_LAUNCH,
      launchDate: LAUNCH,
    });

    for (let i = 1; i <= AFFILIATE_PAYOUT_AFTER_TRANSACTIONS; i++) {
      const result = recordCreatorTransaction({
        creatorUserId: "creator-free-1",
        amountCents: 1000,
        occurredAt: DURING_FREE_DAY,
      });
      expect(result.countedTowardAffiliatePayout).toBe(false);
      expect(result.affiliateBonusTriggered).toBe(false);
    }

    const dash = getAffiliateDashboard("aff-free-1");
    expect(dash.enrolled).toBe(true);
    if (dash.enrolled) {
      expect(dash.profile.totalBonusesPaidCents).toBe(0);
      expect(dash.referrals[0]?.qualifyingTransactionCount).toBe(0);
      expect(dash.referrals[0]?.payoutStatus).toMatch(/24 free hours/i);
    }
  });

  it("pays $5 only after the free 24 hours and five later transactions", () => {
    const affiliate = enrollAffiliate({
      userId: "aff-pay-1",
      userEmail: "aff-pay@test.com",
      displayName: "Referrer Pay",
    });
    enrollContentCreator({
      userId: "creator-pay-1",
      userEmail: "creator-pay@test.com",
      displayName: "Creator After Free Day",
      referralCode: affiliate.referralCode,
      enrolledAt: DURING_LAUNCH,
      launchDate: LAUNCH,
    });

    recordCreatorTransaction({
      creatorUserId: "creator-pay-1",
      amountCents: 1000,
      occurredAt: DURING_FREE_DAY,
    });

    for (let i = 1; i <= AFFILIATE_PAYOUT_AFTER_TRANSACTIONS; i++) {
      const result = recordCreatorTransaction({
        creatorUserId: "creator-pay-1",
        amountCents: 1000,
        occurredAt: new Date(AFTER_FREE_DAY.getTime() + i * 60_000),
      });
      expect(result.countedTowardAffiliatePayout).toBe(true);
      if (i < AFFILIATE_PAYOUT_AFTER_TRANSACTIONS) {
        expect(result.affiliateBonusTriggered).toBe(false);
      } else {
        expect(result.affiliateBonusTriggered).toBe(true);
        expect(result.affiliateUserId).toBe("aff-pay-1");
      }
    }

    const dash = getAffiliateDashboard("aff-pay-1");
    expect(dash.enrolled).toBe(true);
    if (dash.enrolled) {
      expect(dash.profile.totalBonusesPaidCents).toBe(AFFILIATE_BONUS_CENTS);
      expect(dash.profile.qualifiedReferrals).toBe(1);
      expect(dash.referrals[0]?.bonusPaid).toBe(true);
      expect(dash.referrals[0]?.transactionCount).toBe(6);
      expect(dash.referrals[0]?.qualifyingTransactionCount).toBe(5);
    }
  });
});
