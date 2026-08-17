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

describe("ai-subscription-pricing", () => {
  it("uses tiered daily/weekly/monthly pricing", () => {
    expect(getPlanPriceDollars("ai-wellness-001", "day")).toBe(7.99);
    expect(getPlanPriceDollars("ai-wellness-001", "week")).toBe(15.99);
    expect(getPlanPriceDollars("ai-wellness-001", "month")).toBe(24.99);
  });

  it("premium tier specialists cost more than standard", () => {
    expect(getAiPriceTier("linguamate")).toBe("premium");
    expect(getPlanPriceCents("linguamate", "day")).toBe(AI_SUBSCRIPTION_TIER_CENTS.premium.day);
    expect(getPlanPriceCents("linguamate", "month")).toBe(AI_SUBSCRIPTION_TIER_CENTS.premium.month);
  });

  it("professional tier specialists use professional rates", () => {
    expect(getAiPriceTier("ai-coder-001")).toBe("professional");
    expect(getPlanPriceDollars("ai-coder-001", "month")).toBe(29.99);
  });

  it("returns three plan quotes with savings on longer plans", () => {
    const plans = getAiSubscriptionPlans("ai-coder-001");
    expect(plans).toHaveLength(3);
    expect(plans[1]?.savingsVsDaily).toBeTruthy();
  });
});

describe("ai-subscription-service", () => {
  beforeEach(() => _clearAiSubscriptionsForTests());

  it("grants per-AI access after purchase", () => {
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
    expect(hasActiveAiSubscription("user-1", "fan@example.com", "ai-fitness-001")).toBe(false);
  });
});
