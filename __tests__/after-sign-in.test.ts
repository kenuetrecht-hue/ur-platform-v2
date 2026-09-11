import { describe, expect, it } from "vitest";
import { AFTER_SIGN_IN_HREF, shouldOpenAgeVerifyPage } from "../lib/after-sign-in";

describe("after sign-in", () => {
  it("sends signed-in people to the photo page until they pass ID check", () => {
    expect(AFTER_SIGN_IN_HREF).toBe("/age-verify");
    expect(shouldOpenAgeVerifyPage({ isAuthenticated: true, kycVerified: undefined })).toBe(true);
    expect(shouldOpenAgeVerifyPage({ isAuthenticated: true, kycVerified: false })).toBe(true);
    expect(shouldOpenAgeVerifyPage({ isAuthenticated: true, kycVerified: true })).toBe(false);
    expect(shouldOpenAgeVerifyPage({ isAuthenticated: false, kycVerified: false })).toBe(false);
  });

  it("keeps the photo page path as a tap target people can open by hand", () => {
    expect(AFTER_SIGN_IN_HREF.includes("age-verify")).toBe(true);
  });
});
