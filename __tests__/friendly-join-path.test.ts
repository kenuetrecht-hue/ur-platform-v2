import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { LANDING_PLATFORM_UNITY_LINE } from "../lib/landing-platform-copy";
import { PICTURES_PASSED_SIGN_IN_NEXT, SIGNUP_PAGE_TITLE } from "../lib/signup-step-copy";
import { JOIN_EMANUAL_STEPS } from "../lib/join-emanual";

describe("website and app friendliness", () => {
  it("uses one Join or sign in door on the homepage and leftover signup route", () => {
    const home = readFileSync("components/techno-futurist-experience.tsx", "utf8");
    const signup = readFileSync("app/(auth)/signup.tsx", "utf8");
    expect(home).toContain("Join or sign in");
    expect(home).not.toContain("Create account →");
    expect(signup).toContain('from "./login"');
    expect(SIGNUP_PAGE_TITLE).toBe("Join or sign in");
    expect(LANDING_PLATFORM_UNITY_LINE.toLowerCase()).toContain("one website");
  });

  it("tells people we sign them in after the pictures pass", () => {
    expect(PICTURES_PASSED_SIGN_IN_NEXT.toLowerCase()).toContain("signing you in");
    expect(PICTURES_PASSED_SIGN_IN_NEXT.toLowerCase()).not.toContain("tap create account");
  });

  it("walks the e-manual through the same join page", () => {
    const joinStep = JOIN_EMANUAL_STEPS[1]?.clicks.join(" ") ?? "";
    expect(joinStep.toLowerCase()).toContain("login and signup are the same page");
    expect(joinStep.toLowerCase()).toContain("stay logged in");
    expect(joinStep.toLowerCase()).not.toContain("role buttons");
  });
});
