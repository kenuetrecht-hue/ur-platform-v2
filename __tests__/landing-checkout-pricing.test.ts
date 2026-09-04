import { describe, expect, it } from "vitest";
import {
  getLandingPlatformPassPriceDisplay,
  LANDING_ALL_SPECIALISTS_MONTHLY_CENTS,
} from "../lib/landing-checkout-pricing";
import { PLATFORM_PASS_CENTS } from "../lib/ai-subscription-pricing";
import { calculateCustomerCheckout } from "../lib/stripe-checkout-pricing";
import { PUBLIC_PRICING_ENABLED } from "../lib/pricing-visibility";

describe("landing platform pass pricing", () => {
  it("publishes the $24.99 monthly text pass", () => {
    expect(PUBLIC_PRICING_ENABLED).toBe(true);
    expect(LANDING_ALL_SPECIALISTS_MONTHLY_CENTS).toBe(PLATFORM_PASS_CENTS.month);
    expect(LANDING_ALL_SPECIALISTS_MONTHLY_CENTS).toBe(2499);
    expect(getLandingPlatformPassPriceDisplay()).toBe("$24.99/mo");
  });

  it("adds Indiana tax and Stripe on top — UR does not absorb them", () => {
    const checkout = calculateCustomerCheckout(2499, "IN");
    expect(checkout.subtotalCents).toBe(2499);
    expect(checkout.salesTaxCents).toBeGreaterThan(0);
    expect(checkout.stripeFeeCents).toBeGreaterThanOrEqual(30);
    expect(checkout.totalCents).toBe(
      checkout.subtotalCents + checkout.salesTaxCents + checkout.stripeFeeCents,
    );
    expect(checkout.totalCents).toBeGreaterThan(checkout.subtotalCents + checkout.salesTaxCents);
  });

  it("charges no sales tax in Oregon, still passes Stripe to the customer", () => {
    const checkout = calculateCustomerCheckout(2499, "OR");
    expect(checkout.salesTaxCents).toBe(0);
    expect(checkout.stripeFeeCents).toBeGreaterThanOrEqual(30);
    expect(checkout.totalCents).toBeGreaterThan(2499);
  });

  it("charges Florida tax the same way as the in-app pass", () => {
    const checkout = calculateCustomerCheckout(2499, "FL");
    expect(checkout.salesTaxCents).toBeGreaterThan(0);
    expect(checkout.stateCode).toBe("FL");
  });
});
