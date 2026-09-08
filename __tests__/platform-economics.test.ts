import { describe, it, expect } from "vitest";
import {
  getConcurrentSlotEconomics,
  getCreditPlanEconomics,
  getDictatedTextPassEconomics,
  getSubscriptionPlanEconomics,
  getTalkPackEconomics,
  listTalkPackEconomics,
} from "../lib/platform-economics";
import { CREDIT_PRODUCTS } from "../lib/usage-caps-catalog";
import { LOYALTY_POINTS_PER_TALK_MINUTE, LOYALTY_POINTS_PER_TEXT_MESSAGE } from "../lib/loyalty-program-config";

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

  it("$120 / 500-min pack stays at 40%+ margin if all minutes used", () => {
    const econ = getTalkPackEconomics("talk_120");
    expect(econ.priceCents).toBe(12_000);
    expect(econ.totalMinutes).toBe(500);
    expect(econ.grossProfitAtMaxUseCents).toBe(7_000);
    expect(econ.grossMarginAtMaxUsePercent).toBeGreaterThanOrEqual(40);
  });

  it("$200 / 1,000-min pack stays at 40%+ margin if all minutes used", () => {
    const econ = getTalkPackEconomics("talk_200");
    expect(econ.priceCents).toBe(20_000);
    expect(econ.totalMinutes).toBe(1000);
    expect(econ.grossProfitAtMaxUseCents).toBe(10_000);
    expect(econ.grossMarginAtMaxUsePercent).toBeGreaterThanOrEqual(40);
  });

  it("every cash talk pack stays at 40%+ margin if all minutes used", () => {
    for (const econ of listTalkPackEconomics()) {
      expect(econ.grossMarginAtMaxUsePercent).toBeGreaterThanOrEqual(40);
      expect(econ.grossProfitAtMaxUseCents).toBeGreaterThan(0);
    }
  });

  it("text subscriptions stay at 65%+ margin at max usage", () => {
    expect(getSubscriptionPlanEconomics("ai-wellness-001", "day", "standard").grossMarginAtMaxUsePercent).toBeGreaterThanOrEqual(65);
    expect(getSubscriptionPlanEconomics("ai-wellness-001", "week", "standard").grossMarginAtMaxUsePercent).toBeGreaterThanOrEqual(65);
    expect(getSubscriptionPlanEconomics("linguamate", "month", "premium").grossMarginAtMaxUsePercent).toBeGreaterThanOrEqual(65);
    expect(getSubscriptionPlanEconomics("ai-coder-001", "month", "professional").grossMarginAtMaxUsePercent).toBeGreaterThanOrEqual(65);
  });

  it("monthly pass stays profitable when a desk worker only dictates then sends", () => {
    const econ = getDictatedTextPassEconomics("month");
    expect(econ.grossMarginAtMaxUsePercent).toBeGreaterThanOrEqual(65);
    expect(econ.grossProfitAtMaxUseCents).toBeGreaterThan(0);
  });

  it("monthly pass stays profitable even if every message is professional-tier compute", () => {
    const econ = getSubscriptionPlanEconomics("ai-coder-001", "month", "professional");
    expect(econ.priceCents).toBe(2499);
    expect(econ.messagesIncluded).toBe(350);
    expect(econ.maxApiCostCents).toBe(525);
    expect(econ.grossProfitAtMaxUseCents).toBe(1974);
    expect(econ.grossMarginAtMaxUsePercent).toBeGreaterThanOrEqual(75);
  });

  it("extra concurrent slots are nearly all profit", () => {
    expect(getConcurrentSlotEconomics("month").priceCents).toBe(1499);
    expect(getConcurrentSlotEconomics("month").grossMarginAtMaxUsePercent).toBe(100);
  });

  it("credit add-on plans stay at 40%+ margin at max included use", () => {
    for (const product of Object.values(CREDIT_PRODUCTS)) {
      for (const plan of product.plans) {
        const econ = getCreditPlanEconomics(product.id, plan.period);
        expect(econ.grossMarginAtMaxUsePercent).toBeGreaterThanOrEqual(40);
        expect(econ.grossProfitAtMaxUseCents).toBeGreaterThan(0);
      }
    }
  });

  it("loyalty talk costs more than cash talk time", () => {
    expect(LOYALTY_POINTS_PER_TALK_MINUTE).toBe(250);
    expect(LOYALTY_POINTS_PER_TEXT_MESSAGE).toBe(500);
    expect(LOYALTY_POINTS_PER_TALK_MINUTE * 5).toBeGreaterThan(500);
  });
});
