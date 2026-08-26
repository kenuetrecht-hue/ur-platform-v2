import { describe, it, expect, beforeEach } from "vitest";
import {
  getAiPriceTier,
  getAiSubscriptionPlans,
  getComputeTierPriceCents,
  getConcurrentSlotPlans,
  getPlanPriceCents,
  getPlanPriceDollars,
  getPlatformPassPriceCents,
  AI_SUBSCRIPTION_TIER_CENTS,
  PLATFORM_PASS_CENTS,
} from "../lib/ai-subscription-pricing";
import {
  _clearAiSubscriptionsForTests,
  getActiveAiSubscription,
  hasActiveAiSubscription,
  incrementSubscriptionMessageUsage,
  purchaseAiSubscription,
} from "../server/_core/ai-subscription-service";
import {
  _clearPlatformPassSlotsForTests,
  assertCanTalkToMultipleAis,
  claimAiSpecialistSlot,
  getMaxConcurrentAiSlots,
  purchaseExtraConcurrentSlot,
} from "../server/_core/ai-platform-pass-slots";

describe("ai-subscription-pricing", () => {
  it("charges the same platform pass for every specialist", () => {
    expect(getPlanPriceDollars("ai-wellness-001", "day")).toBe(7.99);
    expect(getPlanPriceDollars("ai-wellness-001", "week")).toBe(15.99);
    expect(getPlanPriceDollars("ai-wellness-001", "month")).toBe(24.99);
    expect(getPlanPriceDollars("linguamate", "day")).toBe(7.99);
    expect(getPlanPriceDollars("linguamate", "month")).toBe(24.99);
    expect(getPlanPriceDollars("ai-coder-001", "month")).toBe(24.99);
    expect(getPlanPriceCents("linguamate", "month")).toBe(PLATFORM_PASS_CENTS.month);
  });

  it("keeps compute-tier labels for cost modeling only", () => {
    expect(getAiPriceTier("linguamate")).toBe("premium");
    expect(getComputeTierPriceCents("linguamate", "day")).toBe(AI_SUBSCRIPTION_TIER_CENTS.premium.day);
    expect(getAiPriceTier("ai-coder-001")).toBe("professional");
    expect(getComputeTierPriceCents("ai-coder-001", "month")).toBe(
      AI_SUBSCRIPTION_TIER_CENTS.professional.month,
    );
    expect(getPlatformPassPriceCents("month")).toBe(2499);
  });

  it("returns three plan quotes with savings on longer plans", () => {
    const plans = getAiSubscriptionPlans("ai-coder-001");
    expect(plans).toHaveLength(3);
    expect(plans[0]?.priceCents).toBe(799);
    expect(plans[1]?.savingsVsDaily).toBeTruthy();
    expect(getConcurrentSlotPlans()).toHaveLength(3);
    expect(getConcurrentSlotPlans()[2]?.priceCents).toBe(1499);
  });
});

describe("ai-subscription-service", () => {
  beforeEach(() => {
    _clearAiSubscriptionsForTests();
    _clearPlatformPassSlotsForTests();
  });

  it("grants every specialist after a day/week/month purchase", () => {
    const sub = purchaseAiSubscription({
      userId: "user-1",
      userEmail: "fan@example.com",
      creatorId: "ai-wellness-001",
      plan: "week",
      billingStateCode: "FL",
    });
    expect(sub.plan).toBe("week");
    expect(sub.scope).toBe("platform");
    expect(sub.messagesIncluded).toBe(130);
    expect(hasActiveAiSubscription("user-1", "fan@example.com", "ai-wellness-001")).toBe(true);
    expect(hasActiveAiSubscription("user-1", "fan@example.com", "ai-fitness-001")).toBe(true);
    expect(getActiveAiSubscription("user-1", "ai-coder-001")?.messagesIncluded).toBe(130);
  });

  it("counts messages against the shared platform pass", () => {
    purchaseAiSubscription({
      userId: "user-2",
      userEmail: "fan2@example.com",
      creatorId: "ai-wellness-001",
      plan: "day",
      billingStateCode: "FL",
    });
    incrementSubscriptionMessageUsage("user-2", "ai-wellness-001", 10);
    expect(getActiveAiSubscription("user-2", "ai-fitness-001")?.messagesUsed).toBe(10);
  });

  it("lets one-at-a-time switching stay free and charges extra for concurrent AIs", () => {
    purchaseAiSubscription({
      userId: "user-3",
      userEmail: "fan3@example.com",
      creatorId: "ai-wellness-001",
      plan: "month",
      billingStateCode: "FL",
    });
    expect(getMaxConcurrentAiSlots("user-3")).toBe(1);
    expect(claimAiSpecialistSlot({ userId: "user-3", creatorId: "ai-wellness-001" }).switched).toBe(
      false,
    );
    expect(claimAiSpecialistSlot({ userId: "user-3", creatorId: "ai-fitness-001" }).switched).toBe(
      true,
    );
    expect(() => assertCanTalkToMultipleAis("user-3")).toThrow(/extra concurrent slot/);

    purchaseExtraConcurrentSlot({
      userId: "user-3",
      userEmail: "fan3@example.com",
      creatorId: "ai-wellness-001",
      plan: "month",
      billingStateCode: "FL",
    });
    expect(getMaxConcurrentAiSlots("user-3")).toBe(2);
    expect(
      claimAiSpecialistSlot({
        userId: "user-3",
        creatorId: "ai-wellness-001",
        requireConcurrent: true,
      }).maxSlots,
    ).toBe(2);
  });
});
