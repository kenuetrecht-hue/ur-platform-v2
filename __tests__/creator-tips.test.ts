import { describe, it, expect } from "vitest";
import { CREATOR_TIP_PACKS, creatorTipCheckout } from "../lib/creator-tips";
import { chargeToNetCents, stripeFeeOnChargeCents } from "../lib/stripe-processing-fee";
import { containsForbiddenUrWorldClaim } from "../lib/ur-world-disclosures";
import { CREATOR_TIPS_PURPOSE } from "../lib/creator-tips";
import {
  completeUpholdConnection,
  getCreatorPayoutDashboard,
  processInstantCreatorPayout,
  CREATOR_PAYOUT_SHARE,
} from "../server/_core/creator-payout-service";
import { enrollContentCreator, getContentCreatorProfile } from "../server/_core/partner-program-service";
import { sendCreatorTip } from "../server/_core/creator-tips-service";

describe("Creator tips (100% to creator, fan pays Stripe)", () => {
  it("never prices a tip at exactly $5", () => {
    expect(CREATOR_TIP_PACKS.every((p) => p.priceCents !== 500)).toBe(true);
  });

  it("grosses up the charge so the listed tip remains after Stripe", () => {
    for (const pack of CREATOR_TIP_PACKS) {
      const charge = chargeToNetCents(pack.priceCents);
      const fee = stripeFeeOnChargeCents(charge);
      expect(charge - fee).toBe(pack.priceCents);
      const checkout = creatorTipCheckout(pack.priceCents);
      expect(checkout.creatorGetsCents).toBe(pack.priceCents);
      expect(checkout.chargeCents).toBeGreaterThan(pack.priceCents);
    }
  });

  it("adds Indiana sales tax on top so the creator still receives 100% of the tip", () => {
    const checkout = creatorTipCheckout(1000, "IN");
    expect(checkout.creatorGetsCents).toBe(1000);
    expect(checkout.taxCents).toBeGreaterThan(0);
    expect(checkout.chargeCents).toBe(1000 + checkout.taxCents + checkout.feeCents);
  });

  it("does not pitch tips as charity", () => {
    expect(containsForbiddenUrWorldClaim(CREATOR_TIPS_PURPOSE)).toBe(false);
    expect(CREATOR_TIPS_PURPOSE.toLowerCase()).toContain("100%");
  });

  it("credits the creator 100% of a tip and 85% of a class sale", () => {
    enrollContentCreator({
      userId: "tip-creator-1",
      userEmail: "creator@test.com",
      displayName: "Maya Chen",
    });
    completeUpholdConnection({
      userId: "tip-creator-1",
      upholdEmail: "maya@uphold.com",
    });

    const tip = sendCreatorTip({
      fromUserId: "fan-1",
      fromEmail: "fan@test.com",
      fromName: "Sam Fan",
      creatorUserId: "tip-creator-1",
      packId: "tip_10",
    });
    expect(tip.creatorGetsCents).toBe(1000);
    expect(tip.chargeCents).toBeGreaterThan(1000);
    expect(getContentCreatorProfile("tip-creator-1")?.totalTipCents).toBe(1000);

    const sale = processInstantCreatorPayout({
      creatorUserId: "tip-creator-1",
      grossCents: 2000,
      kind: "sale",
    });
    expect(sale?.netCents).toBe(Math.round(2000 * CREATOR_PAYOUT_SHARE));
    expect(sale?.platformFeeCents).toBeGreaterThan(0);

    const dash = getCreatorPayoutDashboard("tip-creator-1");
    expect(dash.tipSharePercent).toBe(100);
    expect(dash.classSharePercent).toBe(85);
  });

  it("holds 100% of a tip when payout is not connected yet", () => {
    enrollContentCreator({
      userId: "tip-creator-2",
      userEmail: "c2@test.com",
      displayName: "Pat",
    });
    sendCreatorTip({
      fromUserId: "fan-2",
      fromEmail: "fan2@test.com",
      creatorUserId: "tip-creator-2",
      packId: "tip_1",
    });
    const dash = getCreatorPayoutDashboard("tip-creator-2");
    expect(dash.payout.pendingBalanceCents).toBe(100);
  });

  it("rejects tipping a casual member", () => {
    expect(() =>
      sendCreatorTip({
        fromUserId: "fan-3",
        fromEmail: "fan3@test.com",
        creatorUserId: "not-a-creator",
        packId: "tip_2",
      }),
    ).toThrow(/content creator/i);
  });
});
