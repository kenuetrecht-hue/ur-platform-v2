import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import {
  isNewPasswordPath,
  isPasswordRecoveryHref,
  passwordResetRedirectUrl,
  websiteOriginForAuthLinks,
  PUBLIC_WEBSITE_ORIGIN,
} from "../lib/password-recovery-url";
import {
  describeOwnerSigninReset,
  isOwnerSigninResetConfirmed,
  OWNER_SIGNIN_RESET_CONFIRM,
} from "../lib/owner-signin-reset";

describe("password recovery links", () => {
  it("keeps inbox links on the official site name", () => {
    expect(websiteOriginForAuthLinks("https://urplatform.llc")).toBe(PUBLIC_WEBSITE_ORIGIN);
    expect(passwordResetRedirectUrl("https://urplatform.llc")).toBe(
      `${PUBLIC_WEBSITE_ORIGIN}/new-password`,
    );
    expect(passwordResetRedirectUrl()).toBe(`${PUBLIC_WEBSITE_ORIGIN}/new-password`);
  });

  it("keeps people on New password when the email link logs them in", () => {
    expect(isNewPasswordPath("/new-password")).toBe(true);
    expect(isPasswordRecoveryHref("https://example.com/#access_token=x&type=recovery")).toBe(true);
    const guard = readFileSync("components/auth-route-guard.tsx", "utf8");
    const index = readFileSync("app/index.tsx", "utf8");
    const page = readFileSync("app/(auth)/new-password.tsx", "utf8");
    expect(guard).toContain("isNewPasswordPath");
    expect(index).toContain("isPasswordRecoveryHref");
    expect(page).toContain("Save password and go to Login");
  });
});

describe("owner sign-in reset", () => {
  it("requires RESET and only the owner route", () => {
    expect(isOwnerSigninResetConfirmed(OWNER_SIGNIN_RESET_CONFIRM)).toBe(true);
    expect(isOwnerSigninResetConfirmed("nope")).toBe(false);
    expect(describeOwnerSigninReset("clear_so_they_can_signup", true)).toMatch(/Sign up again/i);
    const router = readFileSync("server/routers/platform-ops-router.ts", "utf8");
    const panel = readFileSync("components/owner-signin-reset-panel.tsx", "utf8");
    const ownerOps = readFileSync("app/owner-ops.tsx", "utf8");
    expect(router).toContain("resetMemberSignIn");
    expect(router).toContain("ownerProcedure");
    expect(panel).toContain("Clear sign-in so they can Sign up");
    expect(ownerOps).toContain("OwnerSigninResetPanel");
  });
});
