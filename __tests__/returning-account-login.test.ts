import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("returning account login", () => {
  it("is a dedicated email-and-password page with no ID camera", () => {
    const page = readFileSync("app/(auth)/signin.tsx", "utf8");
    const form = readFileSync("components/returning-account-login.tsx", "utf8");
    expect(page).toContain("ReturningAccountLogin");
    expect(page).toContain("Log in");
    expect(form).toContain("Email is your username");
    expect(form).toContain("rememberSignedInApiDevice");
    expect(form).toContain("AFTER_ID_PASS_HREF");
    expect(form).not.toContain("IdCheckDuringSignin");
    expect(form).not.toContain("Check my three pictures");
  });

  it("sends signed-out people from the app door to /signin", () => {
    const guard = readFileSync("components/auth-route-guard.tsx", "utf8");
    const tabs = readFileSync("app/(tabs)/_layout.tsx", "utf8");
    expect(guard).toContain("hrefForSignedOutUser");
    expect(guard).toContain("signin");
    expect(tabs).toContain('href="/signin"');
  });
});
