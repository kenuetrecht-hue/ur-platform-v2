import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("homepage sign-in", () => {
  it("opens the website on Login, and already-logged-in people go into the app", () => {
    const index = readFileSync("app/index.tsx", "utf8");
    expect(index).toContain("RETURNING_LOGIN_HREF");
    expect(index).toContain("AFTER_ID_PASS_HREF");
    expect(index).not.toContain("AFTER_SIGN_IN_HREF");
    expect(index).not.toContain('"/welcome"');
  });

  it("puts email and password on the front door so a saved browser login has a box to fill", () => {
    const home = readFileSync("components/homepage-sign-in.tsx", "utf8");
    const form = readFileSync("components/returning-account-login.tsx", "utf8");
    expect(home).toContain("ReturningAccountLogin");
    expect(form).toContain('testID="login-email"');
    expect(form).toContain('testID="login-password"');
    expect(form).toContain("Login");
    expect(form).toContain('autoComplete="username"');
    expect(form).toContain('autoComplete="current-password"');
  });
});
