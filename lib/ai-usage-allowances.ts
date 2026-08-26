/**
 * Message allowances bundled with each subscription plan.
 * Sized so API cost at MAX usage stays ≤ ~25% of plan revenue → ~65%+ gross profit after Stripe.
 */

import type { AiSubscriptionPlan, AiPriceTier } from "./ai-subscription-pricing";
import {
  HIVE_MESSAGE_UNITS,
  LEARN_MODE_MESSAGE_UNITS,
  MESSAGE_ALLOWANCE_BY_TIER,
} from "./usage-caps-catalog";

/** Hive mode consults multiple specialists — counts as 3 messages */
export const HIVE_MESSAGE_MULTIPLIER = HIVE_MESSAGE_UNITS;

/** Learn mode / long-form chapters — counts as 5 messages */
export const LEARN_MESSAGE_MULTIPLIER = LEARN_MODE_MESSAGE_UNITS;

/** Base message allowances per plan (standard tier) — owner-approved caps */
export const AI_MESSAGE_ALLOWANCE: Record<AiSubscriptionPlan, number> =
  MESSAGE_ALLOWANCE_BY_TIER.standard;

export const TIER_ALLOWANCE_MULTIPLIER: Record<AiPriceTier, number> = {
  standard: 1,
  professional: 1,
  premium: 1,
};

export function getMessageAllowance(plan: AiSubscriptionPlan, tier: AiPriceTier): number {
  return MESSAGE_ALLOWANCE_BY_TIER[tier][plan];
}

/** Platform-wide membership (legacy) — same caps as the monthly text pass */
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
  learnChaptersApprox: number;
  webSearchesIncludedPerDay: number;
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
    learnChaptersApprox: Math.floor(messagesIncluded / LEARN_MESSAGE_MULTIPLIER),
    webSearchesIncludedPerDay: 10,
    fairUseNote: `${messagesIncluded} messages · hive uses 3 each · learn/chapters use 5 each · 10 web searches/day included.`,
  };
}
