import { describe, expect, it, beforeEach } from "vitest";
import { canUseFreeTaste, FREE_TASTE_PER_USER_PER_DAY, FREE_TASTE_SITE_PER_DAY } from "../lib/free-taste-policy";
import { _resetFreeTasteForTests, claimFreeTaste } from "../server/_core/free-taste-service";

describe("free taste bill cap", () => {
  beforeEach(() => {
    _resetFreeTasteForTests();
  });

  it("keeps owner and store AIs off the free taste", () => {
    expect(canUseFreeTaste("platform-security-ai")).toBe(false);
    expect(canUseFreeTaste("store-manager")).toBe(false);
    expect(canUseFreeTaste("contentmate")).toBe(true);
  });

  it("stops one person after five free messages", async () => {
    for (let i = 0; i < FREE_TASTE_PER_USER_PER_DAY; i++) {
      await claimFreeTaste("taste-user");
    }
    await expect(claimFreeTaste("taste-user")).rejects.toThrow(/free messages/i);
  });

  it("stops the whole site after ten free messages in a day", async () => {
    for (let i = 0; i < FREE_TASTE_SITE_PER_DAY; i++) {
      await claimFreeTaste(`taste-site-${i}`);
    }
    await expect(claimFreeTaste("taste-site-extra")).rejects.toThrow(/whole site/i);
  });
});
