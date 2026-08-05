import { describe, it, expect } from "vitest";
import {
  AI_TALK_PACKS,
  computeTalkBonusMinutes,
  getAiTalkPack,
  listAiTalkPacks,
} from "../lib/ai-talk-pricing";
import {
  purchaseAiTalkPack,
  getAiTalkMinutesRemaining,
  hasAiTalkAccess,
  purchaseAiVideoTalkPack,
} from "../server/_core/ai-premium-media-service";

describe("ai-talk-pricing", () => {
  it("quick pack: $1.99 for 5 minutes with 1 bonus minute", () => {
    const pack = getAiTalkPack("quick_4");
    expect(pack.priceCents).toBe(199);
    expect(pack.billedMinutes).toBe(4);
    expect(pack.bonusMinutes).toBe(1);
    expect(pack.totalMinutes).toBe(5);
  });

  it("standard pack: 20 min @ 50¢/min for $10, receive 30 minutes", () => {
    const pack = getAiTalkPack("standard_20");
    expect(pack.priceCents).toBe(1000);
    expect(pack.billedMinutes).toBe(20);
    expect(pack.rateCentsPerMinute).toBe(50);
    expect(pack.totalMinutes).toBe(30);
    expect(pack.bonusMinutes).toBe(10);
  });

  it("bonus rule: +1 minute per 4 purchased", () => {
    expect(computeTalkBonusMinutes(4)).toBe(1);
    expect(computeTalkBonusMinutes(8)).toBe(2);
    expect(computeTalkBonusMinutes(20)).toBe(5);
  });

  it("lists both talk packs", () => {
    expect(listAiTalkPacks()).toHaveLength(2);
    expect(AI_TALK_PACKS.standard_20.featured).toBe(true);
  });
});

const TEST_STATE = "FL";

describe("ai-talk purchases", () => {
  const email = "talk@test.com";

  it("grants 30 minutes on standard pack purchase", () => {
    const userId = "talk-user-standard";
    purchaseAiTalkPack({ userId, userEmail: email, packId: "standard_20", billingStateCode: TEST_STATE });
    expect(hasAiTalkAccess(userId)).toBe(true);
    expect(getAiTalkMinutesRemaining(userId)).toBe(30);
  });

  it("stacks minutes on repeat purchase", () => {
    const stackUser = "talk-stack-user";
    purchaseAiTalkPack({ userId: stackUser, userEmail: email, packId: "quick_4", billingStateCode: TEST_STATE });
    purchaseAiTalkPack({ userId: stackUser, userEmail: email, packId: "quick_4", billingStateCode: TEST_STATE });
    expect(getAiTalkMinutesRemaining(stackUser)).toBe(10);
  });

  it("legacy video talk purchase uses standard pack", () => {
    purchaseAiVideoTalkPack({ userId: "legacy-user", userEmail: "legacy@test.com", billingStateCode: TEST_STATE });
    expect(getAiTalkMinutesRemaining("legacy-user")).toBe(30);
  });
});
