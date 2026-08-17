import { describe, it, expect, beforeEach } from "vitest";
import {
  CREDIT_PRODUCTS,
  getCreditUpgradeOptions,
  MESSAGE_ALLOWANCE_BY_TIER,
} from "../lib/usage-caps-catalog";
import {
  _clearUsageCreditsForTests,
  assertAndConsumeCredit,
  getCreditBalance,
  grantCreditLot,
} from "../server/_core/usage-credits-service";

describe("usage-caps-catalog", () => {
  it("defines precise image plan caps and upgrade deltas", () => {
    const imagen = CREDIT_PRODUCTS["images-imagen"];
    expect(imagen.plans.find((p) => p.period === "day")?.included).toBe(5);
    expect(imagen.plans.find((p) => p.period === "week")?.included).toBe(20);
    expect(imagen.plans.find((p) => p.period === "month")?.included).toBe(60);
    expect(imagen.dailyHardCap).toBe(25);

    const upgrades = getCreditUpgradeOptions({
      productId: "images-imagen",
      currentPeriod: "day",
      currentRemaining: 0,
    });
    const week = upgrades.find((o) => o.period === "week");
    expect(week?.upgradeDetail).toContain("+15");
  });

  it("uses owner-approved text message caps per tier", () => {
    expect(MESSAGE_ALLOWANCE_BY_TIER.standard.month).toBe(350);
    expect(MESSAGE_ALLOWANCE_BY_TIER.professional.month).toBe(200);
  });
});

describe("usage-credits-service", () => {
  beforeEach(() => _clearUsageCreditsForTests());

  it("consumes image credits and blocks with upgrade message when empty", () => {
    grantCreditLot({ userId: "u1", productId: "images-imagen", period: "day" });
    assertAndConsumeCredit({ userId: "u1", productId: "images-imagen", units: 1 });
    const balance = getCreditBalance("u1", "images-imagen");
    expect(balance.remaining).toBe(4);

    for (let i = 0; i < 4; i++) {
      assertAndConsumeCredit({ userId: "u1", productId: "images-imagen", units: 1 });
    }

    expect(() =>
      assertAndConsumeCredit({ userId: "u1", productId: "images-imagen", units: 1 }),
    ).toThrow(/Upgrade for more/);
  });

  it("enforces daily hard cap even with monthly balance", () => {
    grantCreditLot({ userId: "u2", productId: "images-imagen", period: "month" });
    for (let i = 0; i < 25; i++) {
      assertAndConsumeCredit({ userId: "u2", productId: "images-imagen", units: 1 });
    }
    expect(() =>
      assertAndConsumeCredit({ userId: "u2", productId: "images-imagen", units: 1 }),
    ).toThrow(/limit reached/);
  });
});
