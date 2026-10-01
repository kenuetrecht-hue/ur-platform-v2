import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { isSmsSignInCode, toE164Phone } from "../lib/phone-sign-in-code";
import { explainAuthFailure } from "../lib/auth-network-error";

describe("phone sign-in code", () => {
  it("turns a US mobile number into the texting format", () => {
    expect(toE164Phone("317-555-0100")).toBe("+13175550100");
    expect(toE164Phone("(317) 555-0100")).toBe("+13175550100");
    expect(toE164Phone("13175550100")).toBe("+13175550100");
    expect(toE164Phone("+1 317 555 0100")).toBe("+13175550100");
    expect(() => toE164Phone("555")).toThrow(/mobile number/);
  });

  it("accepts only the 6-digit text code", () => {
    expect(isSmsSignInCode("123456")).toBe(true);
    expect(isSmsSignInCode("12345")).toBe(false);
    expect(isSmsSignInCode("12ab56")).toBe(false);
  });

  it("puts the phone code on Login and explains a missing text provider", () => {
    const login = readFileSync("components/returning-account-login.tsx", "utf8");
    expect(login).toContain("Text a code to my phone");
    expect(login).toContain("loginWithSmsCode");
    expect(explainAuthFailure(new Error("Phone logins are disabled"))).toMatch(/Send a new password/i);
    expect(explainAuthFailure(new Error("Token has expired or is invalid"))).toMatch(/wrong or expired/i);
  });
});
