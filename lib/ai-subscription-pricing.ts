/**
 * Central AI specialist subscription pricing — tiered by compute cost.
 * Standard: $7.99/day · $15.99/week · $24.99/month (owner-approved Aug 2026).
 */

export type AiSubscriptionPlan = "day" | "week" | "month";

export type AiPriceTier = "standard" | "professional" | "premium";

export const AI_PRICE_TIER_LABEL: Record<AiPriceTier, string> = {
  standard: "Standard",
  professional: "Professional",
  premium: "Premium",
};

/** Standard-tier prices in cents — listed in summaries for most specialists. */
export const AI_SUBSCRIPTION_BASE_CENTS: Record<AiSubscriptionPlan, number> = {
  day: 799,
  week: 1599,
  month: 2499,
};

export const AI_SUBSCRIPTION_TIER_CENTS: Record<AiPriceTier, Record<AiSubscriptionPlan, number>> = {
  standard: { day: 799, week: 1599, month: 2499 },
  professional: { day: 999, week: 1999, month: 2999 },
  premium: { day: 899, week: 1799, month: 2799 },
};

const PREMIUM_CREATOR_IDS = new Set(["linguamate", "ai-translator-001"]);

const PROFESSIONAL_CREATOR_IDS = new Set([
  "ai-coder-001",
  "ai-game-dev-001",
  "ai-blueprint-reader-001",
  "ai-3d-specialist",
  "ai-robotics-001",
  "ai-structural-001",
  "ai-seismic-001",
  "ai-wind-load-001",
  "ai-dynamics-001",
]);

export function getAiPriceTier(creatorId: string): AiPriceTier {
  if (PREMIUM_CREATOR_IDS.has(creatorId)) return "premium";
  if (PROFESSIONAL_CREATOR_IDS.has(creatorId)) return "professional";
  return "standard";
}

export function getPlanPriceCents(creatorId: string, plan: AiSubscriptionPlan): number {
  return AI_SUBSCRIPTION_TIER_CENTS[getAiPriceTier(creatorId)][plan];
}

export function getPlanPriceDollars(creatorId: string, plan: AiSubscriptionPlan): number {
  return getPlanPriceCents(creatorId, plan) / 100;
}

export type AiSubscriptionPlanQuote = {
  plan: AiSubscriptionPlan;
  label: string;
  priceCents: number;
  priceDisplay: string;
  durationDays: number;
  tier: AiPriceTier;
  tierLabel: string;
  savingsVsDaily?: string;
};

const PLAN_META: Record<AiSubscriptionPlan, { label: string; durationDays: number }> = {
  day: { label: "24 Hours", durationDays: 1 },
  week: { label: "Weekly", durationDays: 7 },
  month: { label: "Monthly", durationDays: 30 },
};

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function getAiSubscriptionPlans(creatorId: string): AiSubscriptionPlanQuote[] {
  const tier = getAiPriceTier(creatorId);
  const plans: AiSubscriptionPlan[] = ["day", "week", "month"];
  const dailyCents = getPlanPriceCents(creatorId, "day");

  return plans.map((plan) => {
    const priceCents = getPlanPriceCents(creatorId, plan);
    const meta = PLAN_META[plan];
    let savingsVsDaily: string | undefined;
    if (plan !== "day") {
      const equivalentDaily = dailyCents * meta.durationDays;
      if (equivalentDaily > priceCents) {
        const saved = ((equivalentDaily - priceCents) / 100).toFixed(2);
        savingsVsDaily = `Save $${saved} vs daily`;
      }
    }
    return {
      plan,
      label: meta.label,
      priceCents,
      priceDisplay: formatUsd(priceCents),
      durationDays: meta.durationDays,
      tier,
      tierLabel: AI_PRICE_TIER_LABEL[tier],
      savingsVsDaily,
    };
  });
}

export const PLATFORM_ALL_AI_DAY_CENTS = 1599;
export const PLATFORM_ALL_AI_WEEK_CENTS = 3299;
export const PLATFORM_ALL_AI_MONTHLY_CENTS = 6499;

export const AI_SUBSCRIPTION_PLAN_DAYS: Record<AiSubscriptionPlan, number> = {
  day: 1,
  week: 7,
  month: 30,
};

export const AI_SUBSCRIPTION_PLATFORM_SHARE_BPS = 10000;

/** @deprecated Platform AIs — use AI_SUBSCRIPTION_PLATFORM_SHARE_BPS */
export const AI_SUBSCRIPTION_CREATOR_SHARE_BPS = 0;

export function applyCreatorDiscountCents(priceCents: number): number {
  return Math.round(priceCents * 0.75);
}
