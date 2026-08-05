import { describe, it, expect, beforeEach } from "vitest";
import {
  getAiPriceTier,
  getAiSubscriptionPlans,
  getPlanPriceCents,
  getPlanPriceDollars,
  AI_SUBSCRIPTION_BASE_CENTS,
} from "../lib/ai-subscription-pricing";
import {
  _clearAiSubscriptionsForTests,
  hasActiveAiSubscription,
  purchaseAiSubscription,
} from "../server/_core/ai-subscription-service";

describe("ai-subscription-pricing", () => {
  it("uses base daily/weekly/monthly for standard specialists", () => {
    expect(getPlanPriceDollars("ai-wellness-001", "day")).toBe(5.99);
    expect(getPlanPriceDollars("ai-wellness-001", "week")).toBe(9.99);
    expect(getPlanPriceDollars("ai-wellness-001", "month")).toBe(14.99);
  });

  it("charges premium tier more for language translators", () => {
    expect(getAiPriceTier("linguamate")).toBe("premium");
    expect(getAiPriceTier("ai-translator-001")).toBe("premium");
    expect(getPlanPriceCents("linguamate", "day")).toBeGreaterThan(AI_SUBSCRIPTION_BASE_CENTS.day);
    expect(getPlanPriceCents("linguamate", "month")).toBeGreaterThan(AI_SUBSCRIPTION_BASE_CENTS.month);
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
    expect(sub.messagesIncluded).toBe(175);
    expect(hasActiveAiSubscription("user-1", "fan@example.com", "ai-wellness-001")).toBe(true);
    expect(hasActiveAiSubscription("user-1", "fan@example.com", "ai-fitness-001")).toBe(false);
  });
});
