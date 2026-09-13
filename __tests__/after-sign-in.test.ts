import { describe, expect, it } from "vitest";
import {
  AFTER_ID_PASS_HREF,
  AFTER_SIGN_IN_HREF,
  JOIN_ACCOUNT_HREF,
  JOIN_ID_PHOTOS_HREF,
  JOIN_SELFIE_HREF,
  RETURNING_LOGIN_HREF,
  isJoinFlowPath,
  hrefAfterSignIn,
  hrefForSignedOutUser,
  hrefWhenAlreadySignedIn,
  isKycStatusKnown,
  shouldEnterAppAfterMemberSignIn,
  shouldEnterAppAfterSignupClaim,
  shouldEnterAppFromAgeVerify,
  shouldKeepCredentialFormVisible,
  shouldOpenAgeVerifyPage,
  shouldSendAuthenticatedJoinToLogin,
  shouldSendAuthenticatedUserToJoinPictures,
  shouldSendSignedOutUserToLoginFromAgeVerify,
} from "../lib/after-sign-in";

describe("after sign-in", () => {
  it("sends signed-in people to the photo page only when the account is known unverified", () => {
    expect(AFTER_SIGN_IN_HREF).toBe("/age-verify");
    expect(shouldOpenAgeVerifyPage({ isAuthenticated: true, kycVerified: undefined })).toBe(false);
    expect(shouldOpenAgeVerifyPage({ isAuthenticated: true, kycVerified: false })).toBe(true);
    expect(shouldOpenAgeVerifyPage({ isAuthenticated: true, kycVerified: true })).toBe(false);
    expect(shouldOpenAgeVerifyPage({ isAuthenticated: false, kycVerified: false })).toBe(false);
    expect(
      shouldOpenAgeVerifyPage({ isAuthenticated: true, kycVerified: false, hasPhotoPass: true }),
    ).toBe(true);
  });

  it("does not treat a failed or in-flight KYC fetch as needs-pictures", () => {
    expect(isKycStatusKnown({ isLoading: true, isError: false, hasData: false })).toBe(false);
    expect(isKycStatusKnown({ isLoading: false, isError: true, hasData: false })).toBe(false);
    expect(isKycStatusKnown({ isLoading: false, isError: false, hasData: false })).toBe(false);
    expect(isKycStatusKnown({ isLoading: false, isError: false, hasData: true })).toBe(true);
    expect(
      shouldSendAuthenticatedUserToJoinPictures({ kycStatusKnown: false, kycVerified: false }),
    ).toBe(false);
    expect(
      shouldSendAuthenticatedUserToJoinPictures({ kycStatusKnown: true, kycVerified: false }),
    ).toBe(true);
    expect(
      shouldSendAuthenticatedUserToJoinPictures({ kycStatusKnown: true, kycVerified: true }),
    ).toBe(false);
    expect(
      shouldSendAuthenticatedJoinToLogin({ isAuthenticated: true, kycQueryFailed: true }),
    ).toBe(false);
    expect(
      shouldSendAuthenticatedJoinToLogin({ isAuthenticated: true, kycQueryFailed: false }),
    ).toBe(false);
  });

  it("does not open the app from a leftover photo token until the account has the 18+ pass", () => {
    expect(shouldEnterAppAfterSignupClaim(true)).toBe(true);
    expect(shouldEnterAppAfterSignupClaim(false)).toBe(false);
  });

  it("keeps the photo page path as a tap target people can open by hand", () => {
    expect(AFTER_SIGN_IN_HREF.includes("age-verify")).toBe(true);
  });

  it("sends a signed-out person from the leftover ID page to Login", () => {
    expect(shouldSendSignedOutUserToLoginFromAgeVerify()).toBe(true);
  });

  it("lets a returning member enter after login when the account already has the 18+ pass", () => {
    expect(shouldEnterAppAfterMemberSignIn({ claimedOnAccount: false, accountAlreadyVerified: true })).toBe(
      true,
    );
    expect(shouldEnterAppAfterMemberSignIn({ claimedOnAccount: true, accountAlreadyVerified: false })).toBe(
      true,
    );
    expect(shouldEnterAppAfterMemberSignIn({ claimedOnAccount: false, accountAlreadyVerified: false })).toBe(
      false,
    );
  });

  it("opens the app after the photos already passed", () => {
    expect(AFTER_ID_PASS_HREF).toBe("/(tabs)/index");
    expect(hrefAfterSignIn(true)).toBe(AFTER_ID_PASS_HREF);
    expect(hrefAfterSignIn(false)).toBe("/signup");
    expect(JOIN_ACCOUNT_HREF).toBe("/signup");
    expect(JOIN_ID_PHOTOS_HREF).toBe("/signup-id");
    expect(JOIN_SELFIE_HREF).toBe("/signup-selfie");
    expect(isJoinFlowPath("/signup")).toBe(true);
    expect(isJoinFlowPath("(auth)/signup-id")).toBe(true);
    expect(isJoinFlowPath("(auth)/signup-selfie")).toBe(true);
    expect(isJoinFlowPath("/login")).toBe(false);
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

  it("sends a signed-out person to the email-password login, not the pictures page", () => {
    expect(RETURNING_LOGIN_HREF).toBe("/login");
    expect(hrefForSignedOutUser()).toBe("/login");
    expect(hrefWhenAlreadySignedIn()).toBe(AFTER_ID_PASS_HREF);
  });
});
