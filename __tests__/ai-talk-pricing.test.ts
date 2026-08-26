import { describe, it, expect, beforeEach } from "vitest";
import {
  getAiPriceTier,
  getAiSubscriptionPlans,
  getPlanPriceCents,
  getPlanPriceDollars,
  AI_SUBSCRIPTION_TIER_CENTS,
} from "../lib/ai-subscription-pricing";
import {
  _clearAiSubscriptionsForTests,
  hasActiveAiSubscription,
  purchaseAiSubscription,
} from "../server/_core/ai-subscription-service";
import {
  AI_TALK_MINUTES_PER_DOLLAR,
  AI_TALK_RATE_CENTS_PER_MINUTE,
  getAiTalkPack,
  listAiTalkPacks,
} from "../lib/ai-talk-pricing";
import {
  purchaseAiTalkPack,
  getAiTalkMinutesRemaining,
  hasAiTalkAccess,
  purchaseAiVideoTalkPack,
  consumeAiSpeechDuration,
} from "../server/_core/ai-premium-media-service";
import { _clearTalkTimeForTests, getTalkMillisecondsRemaining } from "../server/_core/ai-talk-time-tracker";

describe("ai-subscription-pricing", () => {
  it("uses tiered daily/weekly/monthly pricing", () => {
    expect(getPlanPriceDollars("ai-wellness-001", "day")).toBe(7.99);
    expect(getPlanPriceDollars("ai-wellness-001", "week")).toBe(15.99);
    expect(getPlanPriceDollars("ai-wellness-001", "month")).toBe(24.99);
    expect(getPlanPriceDollars("linguamate", "day")).toBe(7.99);
    expect(getPlanPriceDollars("linguamate", "month")).toBe(24.99);
  });

  it("keeps tier labels for usage with tier-specific prices", () => {
    expect(getAiPriceTier("linguamate")).toBe("premium");
    expect(getPlanPriceCents("linguamate", "day")).toBe(AI_SUBSCRIPTION_TIER_CENTS.standard.day);
  });

  it("returns three plan quotes with savings on longer plans", () => {
    const plans = getAiSubscriptionPlans("ai-coder-001");
    expect(plans).toHaveLength(3);
    expect(plans[1]?.savingsVsDaily).toBeTruthy();
  });
});

describe("ai-talk-pricing", () => {
  it("$1 pack: 5 minutes at 25¢/min reference", () => {
    const pack = getAiTalkPack("talk_1");
    expect(pack.priceCents).toBe(100);
    expect(pack.totalMinutes).toBe(5);
    expect(AI_TALK_RATE_CENTS_PER_MINUTE).toBe(25);
    expect(AI_TALK_MINUTES_PER_DOLLAR).toBe(5);
  });

  it("$5 pack: 25 minutes — in-app channel", () => {
    const pack = getAiTalkPack("talk_5");
    expect(pack.priceCents).toBe(500);
    expect(pack.totalMinutes).toBe(25);
    expect(pack.requiredPaymentChannel).toBe("in_app");
    expect(pack.featured).toBe(true);
  });

  it("$120 pack: 500 minutes — web checkout", () => {
    const pack = getAiTalkPack("talk_120");
    expect(pack.priceCents).toBe(12_000);
    expect(pack.totalMinutes).toBe(500);
    expect(pack.requiredPaymentChannel).toBe("web_browser");
    expect(pack.featured).toBe(true);
  });

  it("$200 pack: 1,000 minutes — web checkout for heavy two-way voice", () => {
    const pack = getAiTalkPack("talk_200");
    expect(pack.priceCents).toBe(20_000);
    expect(pack.totalMinutes).toBe(1000);
    expect(pack.requiredPaymentChannel).toBe("web_browser");
    expect(pack.featured).toBe(true);
  });

  it("lists all four talk packs", () => {
    expect(listAiTalkPacks()).toHaveLength(4);
  });
});

const TEST_STATE = "FL";

describe("ai-talk purchases", () => {
  const email = "talk@test.com";

  beforeEach(() => _clearTalkTimeForTests());

  it("grants 25 minutes (1.5M ms) on $5 pack purchase", () => {
    const userId = "talk-user-standard";
    purchaseAiTalkPack({ userId, userEmail: email, packId: "talk_5", billingStateCode: TEST_STATE });
    expect(hasAiTalkAccess(userId)).toBe(true);
    expect(getAiTalkMinutesRemaining(userId)).toBe(25);
    expect(getTalkMillisecondsRemaining(userId)).toBe(1_500_000);
  });

  it("stacks minutes on repeat $1 purchase as separate lots", () => {
    const stackUser = "talk-stack-user";
    purchaseAiTalkPack({ userId: stackUser, userEmail: email, packId: "talk_1", billingStateCode: TEST_STATE });
    purchaseAiTalkPack({ userId: stackUser, userEmail: email, packId: "talk_1", billingStateCode: TEST_STATE });
    expect(getTalkMillisecondsRemaining(stackUser)).toBe(600_000);
  });

  it("deducts speech duration in milliseconds", () => {
    purchaseAiTalkPack({ userId: "speech-user", userEmail: email, packId: "talk_5", billingStateCode: TEST_STATE });
    consumeAiSpeechDuration({
      userId: "speech-user",
      creatorId: "contentmate",
      durationSeconds: 4.5,
    });
    expect(getTalkMillisecondsRemaining("speech-user")).toBe(1_500_000 - 4500);
  });

  it("grants 500 minutes (30M ms) on $120 pack purchase", () => {
    const userId = "talk-user-bulk";
    purchaseAiTalkPack({ userId, userEmail: email, packId: "talk_120", billingStateCode: TEST_STATE });
    expect(hasAiTalkAccess(userId)).toBe(true);
    expect(getAiTalkMinutesRemaining(userId)).toBe(500);
    expect(getTalkMillisecondsRemaining(userId)).toBe(30_000_000);
  });

  it("grants 1,000 minutes (60M ms) on $200 pack purchase", () => {
    const userId = "talk-user-heavy";
    purchaseAiTalkPack({ userId, userEmail: email, packId: "talk_200", billingStateCode: TEST_STATE });
    expect(hasAiTalkAccess(userId)).toBe(true);
    expect(getAiTalkMinutesRemaining(userId)).toBe(1000);
    expect(getTalkMillisecondsRemaining(userId)).toBe(60_000_000);
  });

  it("legacy video talk purchase uses $5 pack", () => {
    purchaseAiVideoTalkPack({ userId: "legacy-user", userEmail: "legacy@test.com", billingStateCode: TEST_STATE });
    expect(getAiTalkMinutesRemaining("legacy-user")).toBe(25);
  });
});

describe("ai-subscription-service", () => {
  beforeEach(() => _clearAiSubscriptionsForTests());

  it("grants every specialist after a platform-pass purchase", () => {
    const sub = purchaseAiSubscription({
      userId: "user-1",
      userEmail: "fan@example.com",
      creatorId: "ai-wellness-001",
      plan: "week",
      billingStateCode: "FL",
    });
    expect(sub.plan).toBe("week");
    expect(sub.messagesIncluded).toBe(130);
    expect(hasActiveAiSubscription("user-1", "fan@example.com", "ai-wellness-001")).toBe(true);
    expect(hasActiveAiSubscription("user-1", "fan@example.com", "ai-fitness-001")).toBe(true);
  });
});
