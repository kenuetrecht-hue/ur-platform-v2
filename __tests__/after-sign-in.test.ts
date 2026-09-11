import { describe, expect, it } from "vitest";
import {
  AFTER_ID_PASS_HREF,
  AFTER_SIGN_IN_HREF,
  hrefAfterSignIn,
  shouldEnterAppFromAgeVerify,
  shouldKeepCredentialFormVisible,
  shouldOpenAgeVerifyPage,
  shouldSendSignedOutUserToLoginFromAgeVerify,
} from "../lib/after-sign-in";

describe("after sign-in", () => {
  it("sends signed-in people to the photo page until they pass ID check", () => {
    expect(AFTER_SIGN_IN_HREF).toBe("/age-verify");
    expect(shouldOpenAgeVerifyPage({ isAuthenticated: true, kycVerified: undefined })).toBe(true);
    expect(shouldOpenAgeVerifyPage({ isAuthenticated: true, kycVerified: false })).toBe(true);
    expect(shouldOpenAgeVerifyPage({ isAuthenticated: true, kycVerified: true })).toBe(false);
    expect(shouldOpenAgeVerifyPage({ isAuthenticated: false, kycVerified: false })).toBe(false);
    expect(
      shouldOpenAgeVerifyPage({ isAuthenticated: true, kycVerified: false, hasPhotoPass: true }),
    ).toBe(false);
  });

  it("keeps the photo page path as a tap target people can open by hand", () => {
    expect(AFTER_SIGN_IN_HREF.includes("age-verify")).toBe(true);
  });

  it("does not bounce a signed-out person off the ID page", () => {
    expect(shouldSendSignedOutUserToLoginFromAgeVerify()).toBe(false);
  });

  it("opens the app after the photos already passed", () => {
    expect(hrefAfterSignIn(true)).toBe(AFTER_ID_PASS_HREF);
    expect(hrefAfterSignIn(false)).toBe(AFTER_SIGN_IN_HREF);
  });

  it("keeps name email and password on screen until the ID check is on the account", () => {
    expect(shouldKeepCredentialFormVisible({ hasPhotoPass: true, kycVerified: false })).toBe(true);
    expect(shouldKeepCredentialFormVisible({ hasPhotoPass: true, kycVerified: undefined })).toBe(true);
    expect(shouldKeepCredentialFormVisible({ hasPhotoPass: true, kycVerified: true })).toBe(false);
    expect(shouldKeepCredentialFormVisible({ hasPhotoPass: false, kycVerified: false })).toBe(true);
  });

  it("leaves the leftover photo page once the account is verified", () => {
    expect(shouldEnterAppFromAgeVerify({ isAuthenticated: true, kycVerified: true })).toBe(true);
    expect(shouldEnterAppFromAgeVerify({ isAuthenticated: true, kycVerified: false })).toBe(false);
    expect(shouldEnterAppFromAgeVerify({ isAuthenticated: false, kycVerified: true })).toBe(false);
  });
});
