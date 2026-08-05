import { describe, it, expect } from "vitest";
import {
  enrollAffiliate,
  enrollContentCreator,
  recordCreatorTransaction,
  getAffiliateDashboard,
  AFFILIATE_BONUS_CENTS,
  AFFILIATE_PAYOUT_AFTER_TRANSACTIONS,
} from "../server/_core/partner-program-service";

describe("Partner program — affiliate & creator dashboards", () => {
  it("affiliate gets referral code and link", () => {
    const affiliate = enrollAffiliate({
      userId: "aff-1",
      userEmail: "aff@test.com",
      displayName: "Pat",
    });
    expect(affiliate.referralCode.length).toBeGreaterThan(3);
    const dash = getAffiliateDashboard("aff-1");
    expect(dash.enrolled).toBe(true);
    if (dash.enrolled) {
      expect(dash.referralLink).toContain(affiliate.customSlug);
      expect(dash.bonusPerCreatorUsd).toBe("5.00");
      expect(dash.payoutAfterTransactions).toBe(5);
    }
  });

  it("creator referred by affiliate triggers $5 bonus on 5th transaction", () => {
    const affiliate = enrollAffiliate({
      userId: "aff-2",
      userEmail: "aff2@test.com",
      displayName: "Referrer",
    });
    enrollContentCreator({
      userId: "creator-1",
      userEmail: "creator@test.com",
      displayName: "New Creator",
      referralCode: affiliate.referralCode,
    });

    for (let i = 1; i <= AFFILIATE_PAYOUT_AFTER_TRANSACTIONS; i++) {
      const result = recordCreatorTransaction({
        creatorUserId: "creator-1",
        amountCents: 1000,
      });
      if (i < AFFILIATE_PAYOUT_AFTER_TRANSACTIONS) {
        expect(result.affiliateBonusTriggered).toBe(false);
      } else {
        expect(result.affiliateBonusTriggered).toBe(true);
        expect(result.affiliateUserId).toBe("aff-2");
      }
    }

    const dash = getAffiliateDashboard("aff-2");
    expect(dash.enrolled).toBe(true);
    if (dash.enrolled) {
      expect(dash.profile.totalBonusesPaidCents).toBe(AFFILIATE_BONUS_CENTS);
      expect(dash.profile.qualifiedReferrals).toBe(1);
      expect(dash.referrals[0]?.bonusPaid).toBe(true);
    }
  });
});
