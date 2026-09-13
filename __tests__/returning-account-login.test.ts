import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import {
  LOGIN_PAYOUT_BANNER,
  LOGIN_PAYOUT_BANNER_SPLIT,
  LOGIN_PAYOUT_BANNER_TIPS,
} from "../lib/login-payout-banner";

describe("returning account login", () => {
  it("is a dedicated email-and-password page with no ID camera", () => {
    const page = readFileSync("app/(auth)/login.tsx", "utf8");
    const signup = readFileSync("app/(auth)/signup.tsx", "utf8");
    const form = readFileSync("components/returning-account-login.tsx", "utf8");
    expect(page).toContain("ReturningAccountLogin");
    expect(page).toContain("Login");
    expect(page).toContain("go-to-signup");
    expect(page).toContain("login-payout-banner");
    expect(page).toContain("LOGIN_PAYOUT_BANNER_SPLIT");
    expect(page).toContain("LOGIN_PAYOUT_BANNER_TIPS");
    expect(signup).toContain("FinishAccountAfterIdPass");
    expect(signup).toContain("Sign up");
    expect(form).toContain("Email is your username");
    expect(form).toContain("rememberSignedInApiDevice");
    expect(form).toContain("AFTER_ID_PASS_HREF");
    expect(form).not.toContain("IdCheckDuringSignin");
    expect(form).not.toContain("Check my three pictures");
  });

  it("puts the 85-15 split and 100% tips across the top of Login", () => {
    expect(LOGIN_PAYOUT_BANNER).toMatch(/85/);
    expect(LOGIN_PAYOUT_BANNER).toMatch(/15/);
    expect(LOGIN_PAYOUT_BANNER_SPLIT).toMatch(/85/);
    expect(LOGIN_PAYOUT_BANNER_TIPS.toLowerCase()).toContain("100% of tips");
  });

  it("sends signed-out people from the app door to /login", () => {
    const guard = readFileSync("components/auth-route-guard.tsx", "utf8");
    const tabs = readFileSync("app/(tabs)/_layout.tsx", "utf8");
    expect(guard).toContain("hrefForSignedOutUser");
    expect(guard).toContain("RETURNING_LOGIN_HREF");
    expect(guard).toContain("isKycStatusKnown");
    expect(guard).toContain("kycQuery.isError");
    expect(tabs).toContain('href="/login"');
  });

  it("sends leftover /age-verify to Login or Sign up, not a flash loop", () => {
    const ageVerify = readFileSync("app/age-verify.tsx", "utf8");
    const manifest = readFileSync("public/manifest.webmanifest", "utf8");
    const signin = readFileSync("app/(auth)/signin.tsx", "utf8");
    expect(ageVerify).toContain("RETURNING_LOGIN_HREF");
    expect(ageVerify).toContain("JOIN_ACCOUNT_HREF");
    expect(ageVerify).toContain("Redirect");
    expect(ageVerify).not.toContain("FinishAccountAfterIdPass");
    expect(manifest).toContain('"/login"');
    expect(signin).toContain("./login");
  });

  it("keeps new people on Sign up until the account has the 18+ pass", () => {
    const guard = readFileSync("components/auth-route-guard.tsx", "utf8");
    const finish = readFileSync("components/finish-account-after-id-pass.tsx", "utf8");
    expect(guard).toContain("JOIN_ACCOUNT_HREF");
    expect(guard).toContain("kycQuery.isLoading");
    expect(guard).toContain("shouldSendAuthenticatedUserToJoinPictures");
    expect(finish).toContain("JOIN_ID_PHOTOS_HREF");
    expect(finish).not.toContain("AgeKycPhotoCapture");
    const hook = readFileSync("hooks/use-enter-app-after-pictures.ts", "utf8");
    expect(hook).toContain("shouldEnterAppAfterMemberSignIn");
  });

});
