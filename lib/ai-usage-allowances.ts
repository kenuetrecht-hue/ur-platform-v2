/**
 * Message allowances bundled with each subscription plan.
 * Sized so API cost at MAX usage stays ≤ ~25% of plan revenue → ~65%+ gross profit after Stripe.
 *
 * Est. cost basis (conservative):
 *   Standard message  ~$0.008
 *   Professional      ~$0.015 (sandbox / long context)
 *   Premium           ~$0.012 (translation)
 *   Hive consult      3× one message
 */

import type { AiSubscriptionPlan, AiPriceTier } from "./ai-subscription-pricing";

/** Hive mode consults multiple specialists — counts as 3 messages */
export const HIVE_MESSAGE_MULTIPLIER = 3;

/** Learn mode uses longer prompts — counts as 2 messages */
export const LEARN_MESSAGE_MULTIPLIER = 2;

/** Base message allowances per plan (standard tier) — tuned for profit, not break-even */
export const AI_MESSAGE_ALLOWANCE: Record<AiSubscriptionPlan, number> = {
  day: 45,
  week: 175,
  month: 500,
};

/** Scale allowances down for higher-cost tiers */
export const TIER_ALLOWANCE_MULTIPLIER: Record<AiPriceTier, number> = {
  standard: 1,
  professional: 0.7,
  premium: 0.65,
};

export function getMessageAllowance(plan: AiSubscriptionPlan, tier: AiPriceTier): number {
  const base = AI_MESSAGE_ALLOWANCE[plan];
  return Math.floor(base * TIER_ALLOWANCE_MULTIPLIER[tier]);
}

/** Platform-wide membership (legacy) — same caps as monthly per specialist */
export function getMembershipMessageAllowance(
  plan: "day" | "week" | "month" | "year",
): number {
  const map: Record<string, AiSubscriptionPlan> = {
    day: "day",
    week: "week",
    month: "month",
    year: "month",
  };
  return AI_MESSAGE_ALLOWANCE[map[plan] ?? "month"];
}

export type UsageAllowanceQuote = {
  messagesIncluded: number;
  hiveConsultsApprox: number;
  fairUseNote: string;
};

export function getUsageAllowanceQuote(
  plan: AiSubscriptionPlan,
  tier: AiPriceTier,
): UsageAllowanceQuote {
  const messagesIncluded = getMessageAllowance(plan, tier);
  return {
    messagesIncluded,
    hiveConsultsApprox: Math.floor(messagesIncluded / HIVE_MESSAGE_MULTIPLIER),
    fairUseNote: `${messagesIncluded} messages included — hive consults use 3 each.`,
  };
}
