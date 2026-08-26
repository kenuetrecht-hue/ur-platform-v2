/**
 * UR platform unit economics — targets profit, not break-even.
 *
 * MONEY FLOW (who pays when):
 * 1. User pays UR upfront (subscription / talk pack) → cash in your Stripe account
 * 2. Customer pays Stripe 2.9% + $0.30 on top (pass-through) — UR nets full service subtotal
 * 3. Google Gemini / ElevenLabs bill UR Platform LLC monthly (after usage accrues)
 * 4. Usage caps ensure API cost at MAX allowance ≤ TARGET_COGS_BPS of revenue
 *
 * You are NOT charged per user chat in real time — you get paid first, API bill later.
 * Caps prevent a heavy user from creating a bill larger than what they paid you.
 */

import type { AiSubscriptionPlan, AiPriceTier } from "./ai-subscription-pricing";
import { getConcurrentSlotPriceCents, getPlatformPassPriceCents } from "./ai-subscription-pricing";
import { getMessageAllowance } from "./ai-usage-allowances";
import { AI_TALK_PACKS, listAiTalkPacks, type AiTalkPackId } from "./ai-talk-pricing";
import { calculateCustomerCheckout } from "./stripe-checkout-pricing";
import { CREDIT_PRODUCTS, type CreditProductId } from "./usage-caps-catalog";

/** Max API cost as % of plan price when user exhausts full allowance (Cost of Goods Sold) */
export const TARGET_MAX_COGS_BPS = 2500; // 25% — leaves ~75%+ gross profit (Stripe paid by customer)

/** Target gross profit after API at max usage (informational; Stripe not deducted) */
export const TARGET_GROSS_PROFIT_BPS = 6500; // 65%

/** Conservative per-unit API cost estimates (USD) */
export const EST_COST_PER_MESSAGE: Record<AiPriceTier, number> = {
  standard: 0.008,
  professional: 0.015,
  premium: 0.012,
};

/** Voice + LLM per talk minute (ElevenLabs ~$0.08 + model ~$0.02) */
export const EST_COST_PER_TALK_MINUTE_USD = 0.1;

export type PlanEconomics = {
  priceCents: number;
  priceDisplay: string;
  messagesIncluded: number;
  maxApiCostCents: number;
  /** Stripe fee paid by customer (pass-through) */
  customerStripeFeeCents: number;
  customerTotalCents: number;
  grossProfitAtMaxUseCents: number;
  grossMarginAtMaxUsePercent: number;
};

export function getSubscriptionPlanEconomics(
  _creatorId: string,
  plan: AiSubscriptionPlan,
  tier: AiPriceTier,
): PlanEconomics {
  const priceCents = getPlatformPassPriceCents(plan);
  const messagesIncluded = getMessageAllowance(plan, "standard");
  const maxApiCostCents = Math.round(
    messagesIncluded * EST_COST_PER_MESSAGE[tier] * 100,
  );
  const checkout = calculateCustomerCheckout(priceCents);
  const grossProfitAtMaxUseCents = priceCents - maxApiCostCents;
  const grossMarginAtMaxUsePercent =
    priceCents > 0 ? Math.round((grossProfitAtMaxUseCents / priceCents) * 100) : 0;

  return {
    priceCents,
    priceDisplay: `$${(priceCents / 100).toFixed(2)}`,
    messagesIncluded,
    maxApiCostCents,
    customerStripeFeeCents: checkout.stripeFeeCents,
    customerTotalCents: checkout.totalCents,
    grossProfitAtMaxUseCents,
    grossMarginAtMaxUsePercent,
  };
}

export type TalkPackEconomics = {
  packId: AiTalkPackId;
  priceCents: number;
  totalMinutes: number;
  maxApiCostCents: number;
  customerStripeFeeCents: number;
  customerTotalCents: number;
  grossProfitAtMaxUseCents: number;
  grossMarginAtMaxUsePercent: number;
};

export function getTalkPackEconomics(packId: AiTalkPackId): TalkPackEconomics {
  const pack = AI_TALK_PACKS[packId];
  const maxApiCostCents = Math.round(pack.totalMinutes * EST_COST_PER_TALK_MINUTE_USD * 100);
  const checkout = calculateCustomerCheckout(pack.priceCents);
  const grossProfitAtMaxUseCents = pack.priceCents - maxApiCostCents;
  const grossMarginAtMaxUsePercent =
    pack.priceCents > 0
      ? Math.round((grossProfitAtMaxUseCents / pack.priceCents) * 100)
      : 0;

  return {
    packId,
    priceCents: pack.priceCents,
    totalMinutes: pack.totalMinutes,
    maxApiCostCents,
    customerStripeFeeCents: checkout.stripeFeeCents,
    customerTotalCents: checkout.totalCents,
    grossProfitAtMaxUseCents,
    grossMarginAtMaxUsePercent,
  };
}

/** Conservative per-unit API cost for add-on credits (USD). */
export const EST_COST_PER_CREDIT_UNIT: Record<CreditProductId, number> = {
  "images-imagen": 0.04,
  "images-vision": 0.02,
  "code-techbuilder": 0.03,
  "code-techbuilder-studio": 0.05,
  "code-gameforge": 0.04,
  "longform-author": 0.08,
  "search-web": 0.035,
  "hive-consult": 0.05,
  "voice-talk": EST_COST_PER_TALK_MINUTE_USD,
};

export function getCreditPlanEconomics(productId: CreditProductId, period: "day" | "week" | "month") {
  const product = CREDIT_PRODUCTS[productId];
  const plan = product.plans.find((p) => p.period === period);
  if (!plan) {
    throw new Error(`No ${period} plan for ${productId}`);
  }
  const maxApiCostCents = Math.round(plan.included * EST_COST_PER_CREDIT_UNIT[productId] * 100);
  const grossProfitAtMaxUseCents = plan.priceCents - maxApiCostCents;
  const grossMarginAtMaxUsePercent =
    plan.priceCents > 0 ? Math.round((grossProfitAtMaxUseCents / plan.priceCents) * 100) : 0;
  return {
    productId,
    period,
    priceCents: plan.priceCents,
    included: plan.included,
    maxApiCostCents,
    grossProfitAtMaxUseCents,
    grossMarginAtMaxUsePercent,
  };
}

export function getConcurrentSlotEconomics(plan: AiSubscriptionPlan) {
  const priceCents = getConcurrentSlotPriceCents(plan);
  return {
    plan,
    priceCents,
    priceDisplay: `$${(priceCents / 100).toFixed(2)}`,
    maxApiCostCents: 0,
    grossProfitAtMaxUseCents: priceCents,
    grossMarginAtMaxUsePercent: 100,
  };
}

export function listTalkPackEconomics(): TalkPackEconomics[] {
  return listAiTalkPacks().map((pack) => getTalkPackEconomics(pack.id));
}
