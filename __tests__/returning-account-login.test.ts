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
    expect(tabs).toContain('href="/login"');
  });
});
