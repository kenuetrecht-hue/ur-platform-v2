import { describe, it, expect, beforeEach } from "vitest";
import {
  buildUsageLotTrackerView,
  formatUsedLeftLine,
  isUsageLowBalance,
} from "../lib/usage-lot-tracker";
import {
  _clearUsageCreditsForTests,
  assertAndConsumeCredit,
  getCreditBalance,
  grantCreditLot,
} from "../server/_core/usage-credits-service";
import { getUsageDashboard } from "../server/_core/usage-dashboard-service";
import {
  _clearAiSubscriptionsForTests,
  purchaseAiSubscription,
} from "../server/_core/ai-subscription-service";
import { _clearPlatformPassSlotsForTests } from "../server/_core/ai-platform-pass-slots";

describe("usage-lot-tracker", () => {
  it("formats used vs left for any product", () => {
    expect(formatUsedLeftLine({ used: 3, included: 5, remaining: 2, unit: "images" })).toBe(
      "Used 3 of 5 images · 2 left",
    );
    expect(isUsageLowBalance(1, 5)).toBe(true);
    expect(isUsageLowBalance(5, 5)).toBe(false);
  });

  it("builds a lose-by label for a purchase lot", () => {
    const expires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const view = buildUsageLotTrackerView({
      id: "lot-1",
      productId: "images-imagen",
      productLabel: "Logo & creative images",
      unit: "images",
      included: 5,
      used: 1,
      expiresAt: expires,
    });
    expect(view.remaining).toBe(4);
    expect(view.loseByLabel).toMatch(/3 days left/);
    expect(view.lowBalance).toBe(false);
  });
});

describe("credit + text dashboard", () => {
  beforeEach(() => {
    _clearUsageCreditsForTests();
    _clearAiSubscriptionsForTests();
    _clearPlatformPassSlotsForTests();
  });

  it("tracks used and left after an image purchase", () => {
    grantCreditLot({ userId: "u1", productId: "images-imagen", period: "day" });
    assertAndConsumeCredit({ userId: "u1", productId: "images-imagen", units: 2 });
    const balance = getCreditBalance("u1", "images-imagen");
    expect(balance.used).toBe(2);
    expect(balance.included).toBe(5);
    expect(balance.remaining).toBe(3);
    expect(balance.usedLeftLine).toContain("Used 2 of 5");
    expect(balance.lots).toHaveLength(1);
    expect(balance.lots[0]?.remaining).toBe(3);
  });

  it("includes text pass and image credits on the same tracker", () => {
    purchaseAiSubscription({
      userId: "u2",
      userEmail: "u2@test.com",
      creatorId: "ai-wellness-001",
      plan: "week",
      billingStateCode: "FL",
    });
    grantCreditLot({ userId: "u2", productId: "longform-author", period: "month" });
    const dashboard = getUsageDashboard({
      userId: "u2",
      email: "u2@test.com",
      creatorId: "ai-wellness-001",
      isPlatformOwner: false,
    });
    expect(dashboard.items.some((item) => item.id === "text-pass")).toBe(true);
    expect(dashboard.items.some((item) => item.id === "longform-author")).toBe(true);
    expect(dashboard.items.find((item) => item.id === "longform-author")?.usedLeftLine).toContain(
      "25 chapters",
    );
  });
});
