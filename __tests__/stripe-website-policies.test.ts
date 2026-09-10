import { describe, expect, it } from "vitest";
import { isPublicLegalRoute, PUBLIC_LEGAL_NAV, PUBLIC_LEGAL_PATHS } from "../lib/public-legal-routes";
import { PLATFORM_PRIVACY_SECTIONS } from "../lib/platform-privacy-policy";
import {
  ACCEPTED_CARDS_POLICY,
  CANCELLATION_POLICY_BULLETS,
  CANCELLATION_SECTIONS,
  CONTACT_SECTIONS,
  CUSTOMER_SERVICE_BULLETS,
  DIGITAL_DELIVERY_POLICY,
  LEGAL_RESTRICTIONS_POLICY,
  PAYMENT_SECURITY_POLICY,
  PURCHASE_CURRENCY_POLICY,
  REFUND_AND_RETURN_SECTIONS,
  REFUND_REQUEST_PROCESS,
  RETURN_POLICY,
  WHAT_UR_SELLS_POLICY,
} from "../lib/stripe-website-policies";
import { TERMS_SUPPORT_EMAIL } from "../lib/platform-terms-of-use";

function flatten(sections: { bullets: string[] }[]): string {
  return sections
    .flatMap((s) => s.bullets)
    .join(" ")
    .toLowerCase();
}

describe("Stripe website verification copy", () => {
  it("exposes every public legal path Stripe reviewers can open without login", () => {
    expect([...PUBLIC_LEGAL_PATHS]).toEqual([
      "terms",
      "privacy",
      "refunds",
      "cancellations",
      "contact",
    ]);
    expect(PUBLIC_LEGAL_NAV.map((item) => item.href)).toEqual([
      "/terms",
      "/privacy",
      "/refunds",
      "/cancellations",
      "/contact",
    ]);
    expect(isPublicLegalRoute(["terms"])).toBe(true);
    expect(isPublicLegalRoute(["profile"])).toBe(false);
  });

  it("names the business, what is sold, and USD", () => {
    expect(WHAT_UR_SELLS_POLICY).toContain("UR Platform LLC");
    expect(WHAT_UR_SELLS_POLICY.toLowerCase()).toContain("talk time");
    expect(PURCHASE_CURRENCY_POLICY).toContain("United States dollars (USD)");
  });

  it("states refund, return, and delivery process", () => {
    const text = flatten(REFUND_AND_RETURN_SECTIONS);
    expect(text).toContain("no refund");
    expect(text).toContain("email");
    expect(text).toContain(TERMS_SUPPORT_EMAIL);
    expect(RETURN_POLICY.toLowerCase()).toContain("no physical return");
    expect(DIGITAL_DELIVERY_POLICY.toLowerCase()).toContain("after stripe confirms");
  });

  it("states a cancellation policy including auto-renew and live classes", () => {
    const text = CANCELLATION_POLICY_BULLETS.join(" ").toLowerCase();
    expect(text).toContain("auto-renew");
    expect(text).toContain("profile");
    expect(text).toContain("live class");
    expect(CANCELLATION_SECTIONS[0]?.id).toBe("cancellation");
  });

  it("lists customer service email, phone, and street address without requiring login", () => {
    const text = flatten(CONTACT_SECTIONS);
    expect(text).toContain("ken.uetrecht.ur@gmail.com");
    expect(text).toContain("(260) 446-2627");
    expect(text).toContain("145 state road 1");
    expect(text).toContain("hamilton");
    expect(text).toContain("46742");
  });

  it("states 18+ restrictions and Stripe-handled cards", () => {
    expect(LEGAL_RESTRICTIONS_POLICY).toContain("18");
    expect(PAYMENT_SECURITY_POLICY.toLowerCase()).toContain("stripe");
    expect(PAYMENT_SECURITY_POLICY.toLowerCase()).toContain("does not see");
    expect(ACCEPTED_CARDS_POLICY).toMatch(/Visa/);
  });

  it("privacy covers deletion, cookies, and payments", () => {
    const text = flatten(PLATFORM_PRIVACY_SECTIONS);
    expect(text).toContain("does not sell");
    expect(text).toContain("turnstile");
    expect(text).toContain("deleted");
    expect(text).toContain("stripe");
    expect(REFUND_REQUEST_PROCESS.toLowerCase()).toContain("chargebacks");
  });
});
