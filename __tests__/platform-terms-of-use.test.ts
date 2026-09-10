import { describe, it, expect } from "vitest";
import {
  AI_PURCHASE_NO_REFUND_POLICY,
  HARASSMENT_ENFORCEMENT_POLICY,
  CREATOR_TRANSACTION_DISCLAIMER,
  HUMAN_CONDUCT_POLICY,
  PLATFORM_TERMS_SECTIONS,
  TERMS_SIGNUP_ACKNOWLEDGMENT,
  TERMS_HOME_STATE,
  TERMS_BILLING_ENTITY,
  TERMS_GOVERNING_LAW,
  TERMS_SUPPORT_EMAIL,
  PLATFORM_OWNER_LOGIN_EMAIL,
} from "../lib/platform-terms-of-use";
import { resolvePlatformOwnerEmail } from "../server/_core/env";
import { buildSubscriptionPurchaseSummary } from "../lib/pricing-disclosures";

describe("platform-terms-of-use", () => {
  it("states Talk Time clocks, leftover death, and the unused-minute cap", () => {
    const section = PLATFORM_TERMS_SECTIONS.find((s) => s.id === "talk-and-text-passes");
    expect(section).toBeTruthy();
    const text = section!.bullets.join(" ").toLowerCase();
    expect(text).toContain("30 days");
    expect(text).toContain("90 days");
    expect(text).toContain("1,000 unused");
    expect(text).toContain("leftover messages are gone");
    expect(text).toContain("check the box");
    expect(text).toContain("timestamp");
  });

  it("states no refunds on AI purchases", () => {
    expect(AI_PURCHASE_NO_REFUND_POLICY.toLowerCase()).toContain("no refunds");
    expect(AI_PURCHASE_NO_REFUND_POLICY.toLowerCase()).toContain("final");
  });

  it("states creator transactions are not UR responsibility", () => {
    expect(CREATOR_TRANSACTION_DISCLAIMER).toContain("not a party");
    expect(CREATOR_TRANSACTION_DISCLAIMER.toLowerCase()).toContain("creator");
  });

  it("states harassment leads to revocation without refund", () => {
    expect(HARASSMENT_ENFORCEMENT_POLICY.toLowerCase()).toContain("harass");
    expect(HARASSMENT_ENFORCEMENT_POLICY.toLowerCase()).toContain("no refund");
  });

  it("states misuse is the human user's conduct, not the AI or owner", () => {
    expect(HUMAN_CONDUCT_POLICY.toLowerCase()).toContain("human user");
    expect(HUMAN_CONDUCT_POLICY.toLowerCase()).toMatch(/not the ai/);
    expect(HUMAN_CONDUCT_POLICY.toLowerCase()).toMatch(/not ur platform llc|not the platform owner/);
  });

  it("includes dedicated harassment, refunds, and human-conduct sections", () => {
    expect(PLATFORM_TERMS_SECTIONS.some((s) => s.id === "harassment")).toBe(true);
    expect(PLATFORM_TERMS_SECTIONS.some((s) => s.id === "ai-no-refunds")).toBe(true);
    expect(PLATFORM_TERMS_SECTIONS.some((s) => s.id === "creator-transactions")).toBe(true);
    expect(PLATFORM_TERMS_SECTIONS.some((s) => s.id === "talk-and-text-passes")).toBe(true);
    expect(PLATFORM_TERMS_SECTIONS.some((s) => s.id === "human-conduct")).toBe(true);
    expect(PLATFORM_TERMS_SECTIONS.some((s) => s.id === "community-conduct")).toBe(true);
    expect(PLATFORM_TERMS_SECTIONS.some((s) => s.id === "communications-audit")).toBe(true);
    expect(PLATFORM_TERMS_SECTIONS.some((s) => s.id === "law-enforcement")).toBe(true);
  });

  it("signup acknowledgment mentions harassment, no refunds, and 18+", () => {
    expect(TERMS_SIGNUP_ACKNOWLEDGMENT.toLowerCase()).toContain("harassment");
    expect(TERMS_SIGNUP_ACKNOWLEDGMENT.toLowerCase()).toContain("no refunds");
    expect(TERMS_SIGNUP_ACKNOWLEDGMENT.toLowerCase()).toContain("18");
    expect(TERMS_SIGNUP_ACKNOWLEDGMENT.toLowerCase()).toContain("timestamped");
    expect(TERMS_SIGNUP_ACKNOWLEDGMENT.toLowerCase()).toContain("does not sell");
  });

  it("names Indiana as the home state and governing law", () => {
    expect(TERMS_BILLING_ENTITY).toBe("UR Platform LLC");
    expect(TERMS_HOME_STATE).toBe("Indiana");
    expect(TERMS_GOVERNING_LAW).toContain("Indiana");
    expect(PLATFORM_TERMS_SECTIONS.some((s) => s.id === "governing-law")).toBe(true);
  });

  it("uses the UR Gmail as the platform owner login when env is empty", () => {
    expect(PLATFORM_OWNER_LOGIN_EMAIL).toBe("ken.uetrecht.ur@gmail.com");
    expect(PLATFORM_OWNER_LOGIN_EMAIL).toBe(TERMS_SUPPORT_EMAIL);
    expect(resolvePlatformOwnerEmail(undefined)).toBe(PLATFORM_OWNER_LOGIN_EMAIL);
    expect(resolvePlatformOwnerEmail("")).toBe(PLATFORM_OWNER_LOGIN_EMAIL);
    expect(resolvePlatformOwnerEmail("  ")).toBe(PLATFORM_OWNER_LOGIN_EMAIL);
    expect(resolvePlatformOwnerEmail("other@example.com")).toBe("other@example.com");
  });
});

describe("pricing-disclosures terms integration", () => {
  it("subscription summary includes no-refund policy", () => {
    const summary = buildSubscriptionPurchaseSummary({
      creatorId: "ai-wellness-001",
      creatorName: "Wellness",
      plan: "month",
      tier: "standard",
      tierLabel: "Standard",
      stateCode: "FL",
    });
    expect(summary.importantNotes.some((n) => n.toLowerCase().includes("no refunds"))).toBe(true);
    expect(summary.importantNotes.some((n) => n.toLowerCase().includes("harassment"))).toBe(true);
  });
});
