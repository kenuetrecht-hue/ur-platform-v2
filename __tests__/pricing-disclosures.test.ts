import { describe, it, expect } from "vitest";
import {
  buildCartoonCreatorPurchaseSummary,
  buildCartoonStudioPurchaseSummary,
  buildSubscriptionPurchaseSummary,
  buildTalkPurchaseSummary,
  buildUsageCreditPurchaseSummary,
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

    const checkout = calculateCustomerCheckout(2499, "FL");
    expect(summary.pricing.subtotalDisplay).toContain("$24.99");
    expect(summary.pricing.salesTaxCents).toBeGreaterThan(0);
    expect(summary.youPay.value).toContain(checkout.totalDisplay);
    expect(summary.priceBreakdown.some((l) => l.label.includes("Florida"))).toBe(true);
    expect(summary.priceBreakdown.some((l) => l.label === "Stripe processing fee")).toBe(true);
    expect(summary.youReceive.some((l) => l.label === "Messages included")).toBe(true);
    expect(summary.notIncluded.some((s) => s.includes("Voice"))).toBe(true);
    expect(summary.notIncluded.some((s) => s.includes("images"))).toBe(true);
    expect(summary.youReceive.some((l) => l.label === "Web search included")).toBe(true);
    expect(summary.importantNotes.some((n) => n.includes("web browser"))).toBe(true);
    expect(summary.billingEntity).toBe("UR Platform LLC");
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

  it("talk summary states minutes and expiry with state tax", () => {
    const summary = buildTalkPurchaseSummary("talk_5", "TX");

    const checkout = calculateCustomerCheckout(500, "TX");
    expect(summary.pricing.subtotalDisplay).toContain("$5.00");
    expect(summary.pricing.salesTaxCents).toBeGreaterThan(0);
    expect(summary.youPay.value).toContain(checkout.totalDisplay);
    expect(summary.youReceive.some((l) => l.value.includes("20 minutes"))).toBe(true);
    expect(summary.youReceive.some((l) => l.label === "Must use within" && l.value.includes("lose what isn't used"))).toBe(true);
    expect(summary.youReceive.some((l) => l.label === "If unused after 30 days")).toBe(true);
    expect(summary.notIncluded.some((s) => s.includes("Text chat"))).toBe(true);
    expect(summary.importantNotes.some((n) => n.includes("30 days"))).toBe(true);
    expect(summary.importantNotes.some((n) => n.toLowerCase().includes("millisecond"))).toBe(true);
  });

  it("usage credit summary states pay/receive for image packs", () => {
    const summary = buildUsageCreditPurchaseSummary({
      productId: "images-imagen",
      period: "week",
      stateCode: "FL",
    });
    expect(summary).not.toBeNull();
    expect(summary!.youReceive.some((l) => l.value.includes("20 images"))).toBe(true);
    expect(summary!.youReceive.some((l) => l.label === "Daily fair-use cap")).toBe(true);
    expect(summary!.notIncluded.some((s) => s.includes("Text chat"))).toBe(true);
  });

  it("bulk talk pack summary states 500 minutes and web checkout", () => {
    const summary = buildTalkPurchaseSummary("talk_120", "FL");
    expect(summary.pricing.subtotalDisplay).toContain("$120.00");
    expect(summary.youReceive.some((l) => l.value.includes("500 minutes"))).toBe(true);
    expect(summary.importantNotes.some((n) => n.toLowerCase().includes("web browser"))).toBe(true);
  });

  it("heavy talk pack summary states 1,000 minutes and web checkout", () => {
    const summary = buildTalkPurchaseSummary("talk_200", "FL");
    expect(summary.pricing.subtotalDisplay).toContain("$200.00");
    expect(summary.youReceive.some((l) => l.value.includes("1000 minutes"))).toBe(true);
    expect(summary.importantNotes.some((n) => n.toLowerCase().includes("1,000 minutes"))).toBe(true);
    expect(summary.importantNotes.some((n) => n.toLowerCase().includes("web browser"))).toBe(true);
  });

  it("cartoon studio receipt lists cheap vs expensive, tax, Stripe, and no refunds", () => {
    const summary = buildCartoonStudioPurchaseSummary({
      tierId: "draft",
      seconds: 8,
      stateCode: "FL",
    });
    const msg = formatPurchaseReceiptMessage(summary);
    expect(summary.pricing.subtotalDisplay).toContain("$2.00");
    expect(summary.youReceive.some((line) => line.label === "Plan")).toBe(true);
    expect(summary.importantNotes.some((note) => /Five prepaid plans/i.test(note))).toBe(true);
    expect(summary.importantNotes.some((note) => /no return policy/i.test(note))).toBe(true);
    expect(summary.importantNotes.some((note) => /web browser/i.test(note))).toBe(true);
    expect(msg).toContain("Service:");
    expect(msg).toContain("Stripe fee:");
  });

  it("cartoon creator platform receipt lists $3.99-fan cover, tax, Stripe, and no refunds", () => {
    const summary = buildCartoonCreatorPurchaseSummary({ planId: "channel", stateCode: "FL" });
    expect(summary.pricing.subtotalDisplay).toContain("$49.99");
    expect(summary.youReceive.some((line) => line.label === "Covered by $3.99 fans")).toBe(true);
    expect(summary.importantNotes.some((note) => /no return policy/i.test(note))).toBe(true);
  });

  it("formats receipt message for confirmation", () => {
    const summary = buildTalkPurchaseSummary("talk_1", "FL");
    const msg = formatPurchaseReceiptMessage(summary);
    expect(msg).toContain("Service:");
    expect(msg).toContain("$1.00");
    expect(msg).toContain("Stripe fee:");
    expect(msg).toContain(summary.pricing.totalDisplay);
  });
});
