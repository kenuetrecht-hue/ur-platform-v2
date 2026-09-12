import { afterEach, describe, expect, it } from "vitest";
import { splitCreatorStripeCharge } from "../lib/stripe-connect-split";
import { calculateCustomerCheckout } from "../lib/stripe-checkout-pricing";
import {
  CREATOR_PAYOUT_SHARE,
  attachStripeConnectPayout,
  getCreatorPayoutDashboard,
  recordStripeConnectSettlement,
} from "../server/_core/creator-payout-service";
import { enrollContentCreator, getContentCreatorProfile } from "../server/_core/partner-program-service";
import {
  fulfillStripeCheckoutSession,
  STRIPE_CREATOR_SALE_KIND,
  STRIPE_CREATOR_TIP_KIND,
  _resetStripeCheckoutForTests,
} from "../server/_core/stripe-checkout-service";

describe("Stripe Connect creator split (tips 100% / sales 85-15)", () => {
  afterEach(() => {
    _resetStripeCheckoutForTests();
  });

  it("gives the creator 100% of a $10 tip; UR keeps $0; application fee is tax only", () => {
    const priced = calculateCustomerCheckout(1000, "IN");
    const split = splitCreatorStripeCharge({
      kind: "tip",
      subtotalCents: priced.subtotalCents,
      salesTaxCents: priced.salesTaxCents,
      stateFeeCents: priced.stateFeeCents,
      saleShare: CREATOR_PAYOUT_SHARE,
    });
    expect(split.creatorShare).toBe(1);
    expect(split.creatorCents).toBe(1000);
    expect(split.platformFeeCents).toBe(0);
    expect(split.remittableTaxCents).toBe(priced.salesTaxCents + priced.stateFeeCents);
    expect(split.applicationFeeCents).toBe(split.remittableTaxCents);
    expect(priced.salesTaxCents).toBeGreaterThan(0);
  });

  it("gives the creator 85% of a $10 sale; UR keeps 15%; tax rides on the application fee", () => {
    const priced = calculateCustomerCheckout(1000, "IN");
    const split = splitCreatorStripeCharge({
      kind: "sale",
      subtotalCents: priced.subtotalCents,
      salesTaxCents: priced.salesTaxCents,
      stateFeeCents: priced.stateFeeCents,
      saleShare: CREATOR_PAYOUT_SHARE,
    });
    expect(split.creatorShare).toBe(0.85);
    expect(split.creatorCents).toBe(850);
    expect(split.platformFeeCents).toBe(150);
    expect(split.applicationFeeCents).toBe(150 + split.remittableTaxCents);
  });

  it("books Stripe settlements as 100% tip and 85/15 sale", () => {
    enrollContentCreator({
      userId: "stripe-split-creator-1",
      userEmail: "split@test.com",
      displayName: "Split Tester",
      enrolledAt: new Date("2026-10-01T00:00:00.000Z"),
    });
    attachStripeConnectPayout("stripe-split-creator-1", "acct_sim_split1");

    const tip = recordStripeConnectSettlement({
      creatorUserId: "stripe-split-creator-1",
      kind: "tip",
      grossCents: 1000,
      netCents: 1000,
      platformFeeCents: 0,
      sourceTransactionId: "cs_tip_1",
    });
    expect(tip.netCents).toBe(1000);
    expect(tip.platformFeeCents).toBe(0);
    expect(tip.method).toBe("stripe_connect");

    const sale = recordStripeConnectSettlement({
      creatorUserId: "stripe-split-creator-1",
      kind: "sale",
      grossCents: 1000,
      netCents: 9999,
      platformFeeCents: 1,
      sourceTransactionId: "cs_sale_1",
    });
    expect(sale.netCents).toBe(850);
    expect(sale.platformFeeCents).toBe(150);

    const dash = getCreatorPayoutDashboard("stripe-split-creator-1");
    expect(dash.tipSharePercent).toBe(100);
    expect(dash.stripeConnectReady).toBe(true);
  });

  it("fulfills a paid tip checkout as 100% to the creator", () => {
    enrollContentCreator({
      userId: "stripe-split-creator-2",
      userEmail: "tipfulfill@test.com",
      displayName: "Tip Fulfill",
      enrolledAt: new Date("2026-10-01T00:00:00.000Z"),
    });
    const first = fulfillStripeCheckoutSession({
      id: "cs_test_creator_tip_1",
      payment_status: "paid",
      metadata: {
        kind: STRIPE_CREATOR_TIP_KIND,
        creatorUserId: "stripe-split-creator-2",
        priceCents: "400",
        creatorCents: "400",
        platformFeeCents: "0",
      },
    });
    expect(first.handled).toBe(true);
    expect(getContentCreatorProfile("stripe-split-creator-2")?.totalTipCents).toBe(400);
    const second = fulfillStripeCheckoutSession({
      id: "cs_test_creator_tip_1",
      payment_status: "paid",
      metadata: {
        kind: STRIPE_CREATOR_TIP_KIND,
        creatorUserId: "stripe-split-creator-2",
        priceCents: "400",
        creatorCents: "400",
        platformFeeCents: "0",
      },
    });
    expect(second.handled).toBe(true);
    expect(getContentCreatorProfile("stripe-split-creator-2")?.totalTipCents).toBe(400);
  });

  it("fulfills a paid sale checkout as 85/15 even if metadata is wrong", () => {
    enrollContentCreator({
      userId: "stripe-split-creator-3",
      userEmail: "salefulfill@test.com",
      displayName: "Sale Fulfill",
      enrolledAt: new Date("2026-10-01T00:00:00.000Z"),
    });
    const result = fulfillStripeCheckoutSession({
      id: "cs_test_creator_sale_1",
      payment_status: "paid",
      metadata: {
        kind: STRIPE_CREATOR_SALE_KIND,
        creatorUserId: "stripe-split-creator-3",
        priceCents: "2000",
        creatorCents: "2000",
        platformFeeCents: "0",
      },
    });
    expect(result.handled).toBe(true);
    const dash = getCreatorPayoutDashboard("stripe-split-creator-3");
    expect(dash.recentPayouts[0]?.netCents).toBe(1700);
    expect(dash.recentPayouts[0]?.platformFeeCents).toBe(300);
  });
});
