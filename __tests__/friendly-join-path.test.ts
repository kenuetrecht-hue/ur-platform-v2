import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { LANDING_PLATFORM_UNITY_LINE } from "../lib/landing-platform-copy";
import { PICTURES_PASSED_SIGN_IN_NEXT, SIGNUP_PAGE_TITLE } from "../lib/signup-step-copy";
import { JOIN_EMANUAL_STEPS } from "../lib/join-emanual";

describe("website and app friendliness", () => {
  it("uses Login and Sign up doors on the homepage and leftover signup route", () => {
    const home = readFileSync("components/techno-futurist-experience.tsx", "utf8");
    const signup = readFileSync("app/(auth)/signup.tsx", "utf8");
    expect(home).toContain(">Login<");
    expect(home).toContain("HomepageSignIn");
    expect(home).toContain("RETURNING_LOGIN_HREF");
    expect(home).toContain("JOIN_ACCOUNT_HREF");
    expect(home).not.toContain("Create account →");
    expect(signup).toContain("FinishAccountAfterIdPass");
    expect(SIGNUP_PAGE_TITLE).toBe("Sign up");
    expect(LANDING_PLATFORM_UNITY_LINE.toLowerCase()).toContain("one website");
  });

  it("tells people we log them in after the pictures pass", () => {
    expect(PICTURES_PASSED_SIGN_IN_NEXT.toLowerCase()).toContain("logging you in");
    expect(PICTURES_PASSED_SIGN_IN_NEXT.toLowerCase()).not.toContain("tap create account");
  });

  it("walks the e-manual through the same join page", () => {
    const joinStep = JOIN_EMANUAL_STEPS[1]?.clicks.join(" ") ?? "";
    expect(joinStep.toLowerCase()).toContain("sign up");
    expect(joinStep.toLowerCase()).toContain("signup");
    expect(joinStep.toLowerCase()).toContain("stay logged in");
    expect(joinStep.toLowerCase()).not.toContain("role buttons");
  });
});
