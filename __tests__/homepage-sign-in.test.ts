import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("homepage sign-in", () => {
  it("puts email and password on the front door so a saved browser login has a box to fill", () => {
    const home = readFileSync("components/homepage-sign-in.tsx", "utf8");
    const form = readFileSync("components/returning-account-login.tsx", "utf8");
    expect(home).toContain("ReturningAccountLogin");
    expect(form).toContain('testID="login-email"');
    expect(form).toContain('testID="login-password"');
    expect(form).toContain("Log in");
    expect(form).toContain('autoComplete="username"');
    expect(form).toContain('autoComplete="current-password"');
  });
});
