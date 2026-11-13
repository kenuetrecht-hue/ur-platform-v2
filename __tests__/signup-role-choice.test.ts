import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("signup does not ask creator or follower first", () => {
  const banner = readFileSync("components/landing/landing-promo-banner.tsx", "utf8");
  const home = readFileSync("app/(tabs)/index.tsx", "utf8");

  it("uses one Sign up button on the welcome banner", () => {
    expect(banner).toContain('testID="landing-signup"');
    expect(banner).toContain('"Sign up"');
    expect(banner).not.toContain("Sign up as a creator");
    expect(banner).not.toContain("Join free as a follower");
    expect(banner).not.toContain('role: "creator"');
    expect(banner).not.toContain("buildCreatorSignupHref");
  });

  it("puts Become a content creator on the home page", () => {
    expect(home).toContain("BecomeCreatorHomeCard");
    const card = readFileSync("components/become-creator-home-card.tsx", "utf8");
    expect(card).toContain("Become a content creator");
    expect(card).toContain('router.push("/creator-dashboard")');
  });
});
