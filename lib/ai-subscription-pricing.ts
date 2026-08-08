/**
 * Central AI specialist subscription pricing — flat rate per specialist.
 * Each AI: $5.99/day (24h) · $9.99/week · $14.99/month.
 * Tier labels remain for usage allowances only, not price multipliers.
 */

export type AiSubscriptionPlan = "day" | "week" | "month";

export type AiPriceTier = "standard" | "professional" | "premium";

/** Flat per-AI prices in cents — same for every specialist on the platform. */
export const AI_SUBSCRIPTION_BASE_CENTS: Record<AiSubscriptionPlan, number> = {
  day: 599,
  week: 999,
  month: 1499,
};

export const AI_PRICE_TIER_LABEL: Record<AiPriceTier, string> = {
  standard: "Standard",
  professional: "Professional",
  premium: "Premium",
};

/** Premium — high compute / translation API cost (usage caps differ) */
const PREMIUM_CREATOR_IDS = new Set(["linguamate", "ai-translator-001"]);

/** Professional — sandbox, blueprint, or heavy reasoning workloads */
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

/** Same retail price for every AI on the platform. */
export function getPlanPriceCents(_creatorId: string, plan: AiSubscriptionPlan): number {
  return AI_SUBSCRIPTION_BASE_CENTS[plan];
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

/** Platform-wide bundle (optional — separate from per-AI pricing). */
export const PLATFORM_ALL_AI_MONTHLY_CENTS = 4999;

export const AI_SUBSCRIPTION_PLAN_DAYS: Record<AiSubscriptionPlan, number> = {
  day: 1,
  week: 7,
  month: 30,
};

/** Platform-owned AI revenue stays with UR LLC (100%). Creator split applies to human creator stores only. */
export const AI_SUBSCRIPTION_PLATFORM_SHARE_BPS = 10000;

/** @deprecated Platform AIs — use AI_SUBSCRIPTION_PLATFORM_SHARE_BPS */
export const AI_SUBSCRIPTION_CREATOR_SHARE_BPS = 0;

export function applyCreatorDiscountCents(priceCents: number): number {
  return Math.round(priceCents * 0.75);
}
