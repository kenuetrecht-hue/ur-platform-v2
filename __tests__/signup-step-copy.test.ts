import { describe, expect, it } from "vitest";
import {
  AGE_VERIFY_PHOTO_HINTS,
  AGE_VERIFY_THIRD_PARTY,
  AGE_VERIFY_WHAT_TO_DO,
  AGE_VERIFY_WHAT_WE_KEEP,
  AGE_VERIFY_WHY,
  CONDUCT_PAGE_WHY,
  DATA_NOT_SOLD,
  LOGIN_FIELDS,
  LOGIN_PAGE_WHY,
  SECURITY_BREACH_PROMISE,
  SIGNUP_FIELDS,
  SIGNUP_PAGE_WHY,
  WHAT_UR_DOES_NOT_STORE,
  WHAT_UR_STORES_ON_THE_WEBSITE,
  signupPrivacyBlock,
} from "../lib/signup-step-copy";
import { PLATFORM_TERMS_SECTIONS, TERMS_SIGNUP_ACKNOWLEDGMENT } from "../lib/platform-terms-of-use";
import { JOIN_EMANUAL_STEPS } from "../lib/join-emanual";
import { SIGNUP_KYC_CARTOON_BLURB, SIGNUP_KYC_CARTOON_SAMPLE } from "../lib/signup-kyc-cartoon-sample";

function haystack(): string {
  return [
    SIGNUP_PAGE_WHY,
    LOGIN_PAGE_WHY,
    SIGNUP_FIELDS.map((field) => `${field.doThis} ${field.why}`).join(" "),
    LOGIN_FIELDS.map((field) => `${field.doThis} ${field.why}`).join(" "),
    AGE_VERIFY_WHAT_TO_DO,
    AGE_VERIFY_WHY.join(" "),
    AGE_VERIFY_THIRD_PARTY,
    AGE_VERIFY_WHAT_WE_KEEP,
    AGE_VERIFY_PHOTO_HINTS.front,
    AGE_VERIFY_PHOTO_HINTS.back,
    AGE_VERIFY_PHOTO_HINTS.selfie,
    WHAT_UR_STORES_ON_THE_WEBSITE.join(" "),
    WHAT_UR_DOES_NOT_STORE.join(" "),
    DATA_NOT_SOLD,
    SECURITY_BREACH_PROMISE,
    CONDUCT_PAGE_WHY,
    signupPrivacyBlock(),
    TERMS_SIGNUP_ACKNOWLEDGMENT,
    PLATFORM_TERMS_SECTIONS.find((section) => section.id === "age-kyc")?.bullets.join(" ") ?? "",
    JOIN_EMANUAL_STEPS.find((step) => step.number === 3)?.clicks.join(" ") ?? "",
    SIGNUP_KYC_CARTOON_BLURB,
    SIGNUP_KYC_CARTOON_SAMPLE.script,
  ]
    .join("\n")
    .toLowerCase();
}

describe("Signup and ID-check customer copy", () => {
  it("explains what to do and why on signup, login, ID, and conduct", () => {
    const text = haystack();
    expect(SIGNUP_FIELDS).toHaveLength(7);
    expect(text).toContain("keep fraud off");
    expect(text).toContain("creator");
    expect(text).toContain("what to do");
    expect(text).toContain("photograph a government id");
    expect(text).toContain("live selfie");
    expect(text).toContain("check the box");
  });

  it("says UR does not keep the ID pictures and names the third-party checker", () => {
    const text = haystack();
    expect(text).toContain("does not keep the id pictures");
    expect(text).toContain("google");
    expect(text).toContain("hash");
    expect(text).not.toContain("jumio");
    expect(text).not.toContain("persona");
    expect(text).not.toContain("stripe identity");
  });

  it("lists what stays on the website and what does not", () => {
    expect(WHAT_UR_STORES_ON_THE_WEBSITE.join(" ").toLowerCase()).toContain("name and email");
    expect(WHAT_UR_STORES_ON_THE_WEBSITE.join(" ").toLowerCase()).toContain("photo hashes");
    expect(WHAT_UR_DOES_NOT_STORE.join(" ").toLowerCase()).toContain("reusable copy");
    expect(WHAT_UR_DOES_NOT_STORE.join(" ").toLowerCase()).toContain("password in plain text");
    expect(signupPrivacyBlock().toLowerCase()).toContain("what stays on the website");
  });

  it("promises we do not sell data and that a breach notice is posted on the website", () => {
    const text = haystack();
    expect(text).toContain("does not sell");
    expect(text).toContain("does not give it away");
    expect(text).toContain("notify you immediately on this website");
    expect(text).toContain("email on your account");
    expect(text).toContain("law requires");
  });

  it("does not claim nothing is stored on the website", () => {
    expect(signupPrivacyBlock().toLowerCase()).not.toContain("nothing is stored");
    expect(signupPrivacyBlock().toLowerCase()).not.toContain("none of their information");
  });
});
