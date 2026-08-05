import { describe, it, expect } from "vitest";
import {
  buildSubscriptionPurchaseSummary,
  buildTalkPurchaseSummary,
  formatPurchaseReceiptMessage,
} from "../lib/pricing-disclosures";
import { calculateCustomerCheckout } from "../lib/stripe-checkout-pricing";

describe("pricing-disclosures", () => {
  it("subscription summary states price, messages, and exclusions for Florida", () => {
    const summary = buildSubscriptionPurchaseSummary({
      creatorId: "ai-wellness-001",
      creatorName: "AI Wellness Coach",
      plan: "month",
      tier: "standard",
      tierLabel: "Standard",
      stateCode: "FL",
    });

    const checkout = calculateCustomerCheckout(1499, "FL");
    expect(summary.pricing.subtotalDisplay).toContain("$14.99");
    expect(summary.pricing.salesTaxCents).toBeGreaterThan(0);
    expect(summary.youPay.value).toContain(checkout.totalDisplay);
    expect(summary.priceBreakdown.some((l) => l.label.includes("Florida"))).toBe(true);
    expect(summary.priceBreakdown.some((l) => l.label === "Stripe processing fee")).toBe(true);
    expect(summary.youReceive.some((l) => l.label === "Messages included")).toBe(true);
    expect(summary.notIncluded.some((s) => s.includes("Voice"))).toBe(true);
    expect(summary.aiDisclosure).toContain("AI");
    expect(summary.billingEntity).toBe("UR LLC");
  });

  it("Oregon subscription shows zero sales tax", () => {
    const summary = buildSubscriptionPurchaseSummary({
      creatorId: "ai-wellness-001",
      creatorName: "AI Wellness Coach",
      plan: "month",
      tier: "standard",
      tierLabel: "Standard",
      stateCode: "OR",
    });
    expect(summary.pricing.salesTaxCents).toBe(0);
    expect(summary.priceBreakdown.some((l) => l.value.includes("not applicable"))).toBe(true);
  });

  it("talk summary states minutes, bonus, and expiry with state tax", () => {
    const summary = buildTalkPurchaseSummary("standard_20", "TX");

    const checkout = calculateCustomerCheckout(1000, "TX");
    expect(summary.pricing.subtotalDisplay).toContain("$10.00");
    expect(summary.pricing.salesTaxCents).toBeGreaterThan(0);
    expect(summary.youPay.value).toContain(checkout.totalDisplay);
    expect(summary.youReceive.some((l) => l.value.includes("30 minutes"))).toBe(true);
    expect(summary.notIncluded.some((s) => s.includes("Text chat"))).toBe(true);
    expect(summary.importantNotes.some((n) => n.includes("30-day"))).toBe(true);
  });

  it("formats receipt message for confirmation", () => {
    const summary = buildTalkPurchaseSummary("quick_4", "FL");
    const msg = formatPurchaseReceiptMessage(summary);
    expect(msg).toContain("Service:");
    expect(msg).toContain("$1.99");
    expect(msg).toContain("Stripe fee:");
    expect(msg).toContain(summary.pricing.totalDisplay);
  });
});
