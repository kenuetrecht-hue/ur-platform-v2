import { describe, it, expect } from "vitest";
import {
  applyAffiliateDisclosures,
  messageContainsAffiliateLink,
  isAffiliateOrAdUrl,
} from "../server/_core/affiliate-disclosure-service";
import {
  AFFILIATE_LINK_BEFORE_TEXT,
  AFFILIATE_LINK_AFTER_TEXT,
  AFFILIATE_LINK_BEFORE_VOICE,
  AFFILIATE_LINK_AFTER_VOICE,
} from "../lib/platform-disclosure-copy";

describe("Affiliate link before/after disclosures", () => {
  it("detects affiliate URLs", () => {
    expect(isAffiliateOrAdUrl("https://www.amazon.com/dp/B09?tag=ur-20")).toBe(true);
    expect(isAffiliateOrAdUrl("https://urplatform.app/link/ken-abc")).toBe(true);
    expect(isAffiliateOrAdUrl("https://example.com/docs")).toBe(false);
  });

  it("wraps text chat links with before and after disclosure", () => {
    const input = "Try this tool: https://www.amazon.com/dp/B09?tag=ur-20 today!";
    const { text, hadAffiliateLinks } = applyAffiliateDisclosures(input, "text");
    expect(hadAffiliateLinks).toBe(true);
    expect(text).toContain(AFFILIATE_LINK_BEFORE_TEXT);
    expect(text).toContain(AFFILIATE_LINK_AFTER_TEXT);
    expect(text.indexOf(AFFILIATE_LINK_BEFORE_TEXT)).toBeLessThan(text.indexOf("https://"));
    expect(text.indexOf("https://")).toBeLessThan(text.indexOf(AFFILIATE_LINK_AFTER_TEXT));
  });

  it("wraps markdown affiliate links", () => {
    const input = "Deal: [Shop now](https://www.amazon.com/deals?tag=aff) ends tonight.";
    const { text, hadAffiliateLinks } = applyAffiliateDisclosures(input, "text");
    expect(hadAffiliateLinks).toBe(true);
    expect(text).toContain(AFFILIATE_LINK_BEFORE_TEXT);
    expect(text).toContain("[Shop now](https://www.amazon.com/deals?tag=aff)");
    expect(text).toContain(AFFILIATE_LINK_AFTER_TEXT);
  });

  it("wraps voice/TTS copy with spoken disclosures", () => {
    const input = "Check https://urplatform.app/link/creator-1 for the class.";
    const { text, hadAffiliateLinks } = applyAffiliateDisclosures(input, "voice");
    expect(hadAffiliateLinks).toBe(true);
    expect(text).toContain(AFFILIATE_LINK_BEFORE_VOICE);
    expect(text).toContain(AFFILIATE_LINK_AFTER_VOICE);
  });

  it("detects affiliate content in messages", () => {
    expect(messageContainsAffiliateLink("See https://amzn.to/abc")).toBe(true);
    expect(messageContainsAffiliateLink("Hello, how are you?")).toBe(false);
  });

  it("leaves non-ad URLs unchanged when no ad context", () => {
    const input = "Docs: https://example.com/api/reference";
    const { text, hadAffiliateLinks } = applyAffiliateDisclosures(input, "text");
    expect(hadAffiliateLinks).toBe(false);
    expect(text).toBe(input);
  });
});
