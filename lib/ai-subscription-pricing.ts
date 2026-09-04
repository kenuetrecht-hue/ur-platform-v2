/**
 * Platform text pass — day / week / month unlocks every UR specialist, one at a time.
 * $7.99/day · $15.99/week · $24.99/month (competitive with ChatGPT Plus / Claude Pro).
 * Talking to more than one AI at once (Hive / Town Hall) requires a paid extra slot.
 */

export type AiSubscriptionPlan = "day" | "week" | "month";

export type AiPriceTier = "standard" | "professional" | "premium";

export const AI_PRICE_TIER_LABEL: Record<AiPriceTier, string> = {
  standard: "Standard",
  professional: "Professional",
  premium: "Premium",
};

/** Stored subscription key — one pass per user, valid for every specialist. */
export const PLATFORM_PASS_ID = "platform-pass";

/** Standard-tier / platform-pass prices in cents. */
export const AI_SUBSCRIPTION_BASE_CENTS: Record<AiSubscriptionPlan, number> = {
  day: 799,
  week: 1599,
  month: 2499,
};

/** Historical compute-tier catalog — checkout uses the platform pass, not these. */
export const AI_SUBSCRIPTION_TIER_CENTS: Record<AiPriceTier, Record<AiSubscriptionPlan, number>> = {
  standard: { day: 799, week: 1599, month: 2499 },
  professional: { day: 999, week: 1999, month: 2999 },
  premium: { day: 899, week: 1799, month: 2799 },
};

export const PLATFORM_PASS_CENTS: Record<AiSubscriptionPlan, number> = {
  day: 799,
  week: 1599,
  month: 2499,
};

export const PLATFORM_ALL_AI_DAY_CENTS = PLATFORM_PASS_CENTS.day;
export const PLATFORM_ALL_AI_WEEK_CENTS = PLATFORM_PASS_CENTS.week;
export const PLATFORM_ALL_AI_MONTHLY_CENTS = PLATFORM_PASS_CENTS.month;

/** Included concurrent specialists on a text pass — switch freely, one chat at a time. */
export const INCLUDED_CONCURRENT_AI_SLOTS = 1;

/** Extra concurrent AI slot (Hive / Town Hall / two chats at once). */
export const CONCURRENT_AI_SLOT_CENTS: Record<AiSubscriptionPlan, number> = {
  day: 499,
  week: 999,
  month: 1499,
};

const PREMIUM_CREATOR_IDS = new Set(["linguamate", "ai-translator-001", "ai-reading-001"]);

const PROFESSIONAL_CREATOR_IDS = new Set([
  "ai-coder-001",
  "ai-game-dev-001",
  "ai-blockchain-001",
  "ai-math-001",
  "ai-blueprint-reader-001",
  "ai-3d-specialist",
  "ai-robotics-001",
  "ai-structural-001",
  "ai-seismic-001",
  "ai-wind-load-001",
  "ai-dynamics-001",
  "ai-cnc-master-001",
]);

export function getAiPriceTier(creatorId: string): AiPriceTier {
  if (PREMIUM_CREATOR_IDS.has(creatorId)) return "premium";
  if (PROFESSIONAL_CREATOR_IDS.has(creatorId)) return "professional";
  return "standard";
}

export function getPlatformPassPriceCents(plan: AiSubscriptionPlan): number {
  return PLATFORM_PASS_CENTS[plan];
}

export function getConcurrentSlotPriceCents(plan: AiSubscriptionPlan): number {
  return CONCURRENT_AI_SLOT_CENTS[plan];
}

/** Legacy compute-tier list price — not charged at checkout. */
export function getComputeTierPriceCents(creatorId: string, plan: AiSubscriptionPlan): number {
  return AI_SUBSCRIPTION_TIER_CENTS[getAiPriceTier(creatorId)][plan];
}

/** Checkout price — platform pass is the same for every specialist. */
export function getPlanPriceCents(_creatorId: string, plan: AiSubscriptionPlan): number {
  return getPlatformPassPriceCents(plan);
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
  const dailyCents = getPlatformPassPriceCents("day");

  return plans.map((plan) => {
    const priceCents = getPlatformPassPriceCents(plan);
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

export type ConcurrentSlotQuote = {
  plan: AiSubscriptionPlan;
  label: string;
  priceCents: number;
  priceDisplay: string;
  durationDays: number;
};

export function getConcurrentSlotPlans(): ConcurrentSlotQuote[] {
  return (["day", "week", "month"] as AiSubscriptionPlan[]).map((plan) => ({
    plan,
    label: PLAN_META[plan].label,
    priceCents: getConcurrentSlotPriceCents(plan),
    priceDisplay: formatUsd(getConcurrentSlotPriceCents(plan)),
    durationDays: PLAN_META[plan].durationDays,
  }));
}

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
