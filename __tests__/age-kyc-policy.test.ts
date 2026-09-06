import { describe, it, expect } from "vitest";
import {
  AGE_KYC_MIN_AGE,
  ageFromIsoDate,
  isAdultAge,
} from "../lib/age-kyc-policy";
import { PLATFORM_TERMS_SECTIONS, TERMS_SIGNUP_ACKNOWLEDGMENT } from "../lib/platform-terms-of-use";

describe("age-kyc-policy", () => {
  it("requires age 18", () => {
    expect(AGE_KYC_MIN_AGE).toBe(18);
  });

  it("computes age from ISO date of birth", () => {
    const now = new Date(Date.UTC(2026, 7, 26));
    expect(ageFromIsoDate("2000-01-01", now)).toBe(26);
    expect(ageFromIsoDate("2008-08-27", now)).toBe(17);
    expect(ageFromIsoDate("2008-08-26", now)).toBe(18);
    expect(ageFromIsoDate("not-a-date", now)).toBeNull();
  });

  it("treats 18 and over as adult", () => {
    expect(isAdultAge(18)).toBe(true);
    expect(isAdultAge(17)).toBe(false);
    expect(isAdultAge(null)).toBe(false);
  });
});

describe("age-kyc terms", () => {
  it("requires 18+ ID front, back, and selfie before entry", () => {
    expect(PLATFORM_TERMS_SECTIONS.some((s) => s.id === "age-kyc")).toBe(true);
    expect(TERMS_SIGNUP_ACKNOWLEDGMENT.toLowerCase()).toContain("18");
    expect(TERMS_SIGNUP_ACKNOWLEDGMENT.toLowerCase()).toContain("selfie");
    expect(TERMS_SIGNUP_ACKNOWLEDGMENT.toLowerCase()).toContain("fraud");
    expect(TERMS_SIGNUP_ACKNOWLEDGMENT.toLowerCase()).toContain("does not keep the id pictures");
  });
});
