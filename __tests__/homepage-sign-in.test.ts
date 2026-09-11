import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("homepage sign-in", () => {
  it("puts email and password on the front door so a saved browser login has a box to fill", () => {
    const home = readFileSync("components/homepage-sign-in.tsx", "utf8");
    expect(home).toContain('testID="login-email"');
    expect(home).toContain('testID="login-password"');
    expect(home).toContain("Sign me in");
    expect(home).toContain('autoComplete="username"');
    expect(home).toContain('autoComplete="current-password"');
  });
});
