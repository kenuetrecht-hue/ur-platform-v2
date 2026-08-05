import { describe, it, expect } from "vitest";
import {
  getSubscriptionPlanEconomics,
  getTalkPackEconomics,
} from "../lib/platform-economics";

describe("platform-economics", () => {
  it("monthly standard plan targets 65%+ gross margin at max usage", () => {
    const econ = getSubscriptionPlanEconomics("ai-wellness-001", "month", "standard");
    expect(econ.grossMarginAtMaxUsePercent).toBeGreaterThanOrEqual(65);
    expect(econ.grossProfitAtMaxUseCents).toBeGreaterThan(900);
  });

  it("talk standard pack stays profitable if all minutes used", () => {
    const econ = getTalkPackEconomics("standard_20");
    expect(econ.grossMarginAtMaxUsePercent).toBeGreaterThanOrEqual(55);
  });

  it("quick talk pack is profitable after Stripe", () => {
    const econ = getTalkPackEconomics("quick_4");
    expect(econ.grossProfitAtMaxUseCents).toBeGreaterThan(0);
  });
});
