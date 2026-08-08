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

  it("talk $5 pack stays profitable if all minutes used", () => {
    const econ = getTalkPackEconomics("talk_5");
    expect(econ.grossMarginAtMaxUsePercent).toBeGreaterThanOrEqual(40);
  });

  it("quick $1 talk pack is profitable after Stripe", () => {
    const econ = getTalkPackEconomics("talk_1");
    expect(econ.grossProfitAtMaxUseCents).toBeGreaterThan(0);
  });
});
