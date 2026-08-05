import { describe, it, expect } from "vitest";
import {
  calculateCustomerCheckout,
  estimateStripeFeeOnChargeCents,
} from "../lib/stripe-checkout-pricing";
import { calculateStateTaxAndFees } from "../lib/us-state-taxes";

describe("stripe-checkout-pricing", () => {
  it("grosses up so UR nets full subtotal after Stripe", () => {
    const checkout = calculateCustomerCheckout(1499, "OR");
    expect(checkout.subtotalCents).toBe(1499);
    expect(checkout.totalCents).toBeGreaterThan(1499);
    const stripeOnTotal = estimateStripeFeeOnChargeCents(checkout.totalCents);
    expect(checkout.totalCents - stripeOnTotal).toBeGreaterThanOrEqual(1499);
  });

  it("includes Florida sales tax in customer total", () => {
    const checkout = calculateCustomerCheckout(1499, "FL");
    expect(checkout.salesTaxCents).toBeGreaterThan(0);
    expect(
      checkout.subtotalCents + checkout.salesTaxCents + checkout.stripeFeeCents,
    ).toBe(checkout.totalCents);
  });

  it("includes fixed $0.30 in customer total", () => {
    const checkout = calculateCustomerCheckout(199, "FL");
    expect(checkout.stripeFeeCents).toBeGreaterThanOrEqual(30);
    expect(checkout.totalDisplay).toMatch(/^\$\d+\.\d{2}$/);
  });
});

describe("us-state-taxes", () => {
  it("calculates Texas sales tax on subtotal", () => {
    const tax = calculateStateTaxAndFees(1000, "TX");
    expect(tax?.salesTaxCents).toBe(83);
    expect(tax?.taxable).toBe(true);
  });

  it("returns zero tax for Oregon", () => {
    const tax = calculateStateTaxAndFees(1000, "OR");
    expect(tax?.salesTaxCents).toBe(0);
    expect(tax?.taxable).toBe(false);
  });
});
