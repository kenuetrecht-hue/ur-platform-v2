import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import {
  LANDING_WHAT_WE_OFFER,
  LANDING_WHAT_WE_OFFER_LEDE,
  LANDING_WHAT_WE_OFFER_TITLE,
} from "../lib/landing-platform-copy";

describe("landing what we offer", () => {
  it("lists the digital products Stripe and visitors need to see", () => {
    expect(LANDING_WHAT_WE_OFFER_TITLE).toBe("What we offer");
    expect(LANDING_WHAT_WE_OFFER).toEqual([
      "Digital community",
      "Social networking",
      "Creator platform",
      "Digital content creation",
      "Digital subscriptions",
      "Selling digital goods",
      "SaaS (Software as a Service)",
      "Digital AI tools",
    ]);
    expect(LANDING_WHAT_WE_OFFER_LEDE.toLowerCase()).toContain("digital community");
    expect(LANDING_WHAT_WE_OFFER_LEDE.toLowerCase()).toContain("saas");
    expect(LANDING_WHAT_WE_OFFER_LEDE.toLowerCase()).toContain("18+");
  });

  it("puts that list on Login (front door) and Welcome", () => {
    const login = readFileSync("app/(auth)/login.tsx", "utf8");
    const welcome = readFileSync("components/techno-futurist-experience.tsx", "utf8");
    expect(login).toContain("LandingWhatWeOffer");
    expect(welcome).toContain("LandingWhatWeOffer");
  });
});
