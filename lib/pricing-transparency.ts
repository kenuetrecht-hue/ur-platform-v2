/**
 * Plain-language pricing copy — what you pay and what you receive.
 * Client-safe; sourced from usage-caps-catalog + ur-recommended-pricing.
 */

import type { AiSubscriptionPlan } from "./ai-subscription-pricing";
import {
  formatUsd,
  getPlanPriceCents,
  AI_SUBSCRIPTION_PLAN_DAYS,
} from "./ai-subscription-pricing";
import { getUsageAllowanceQuote } from "./ai-usage-allowances";
import {
  CREDIT_PRODUCTS,
  type CreditProductId,
  MESSAGE_ALLOWANCE_BY_TIER,
  TEXT_SUB_INCLUDED_WEB_SEARCHES_PER_DAY,
} from "./usage-caps-catalog";
import { UR_RECOMMENDED_PRICING } from "./ur-recommended-pricing";

export type PlainPricingPlan = {
  period: "day" | "week" | "month";
  periodLabel: string;
  priceDisplay: string;
  priceCents: number;
  included: number;
  unit: string;
  /** One line: "You pay $15.99 → You get 130 text messages for 7 days" */
  payReceiveLine: string;
  dailyCapNote?: string;
};

export type PlainProductPricing = {
  id: string;
  category: string;
  feature: string;
  unit: string;
  dailyHardCap?: number;
  plans: PlainPricingPlan[];
  addons?: Array<{ label: string; priceDisplay: string; payReceiveLine: string }>;
  notIncludedNote?: string;
};

function periodLabel(period: "day" | "week" | "month"): string {
  if (period === "day") return "24 hours";
  if (period === "week") return "7 days";
  return "30 days";
}

export function buildTextSubscriptionPlainPlans(
  creatorId: string,
): PlainProductPricing {
  const plans: PlainPricingPlan[] = (["day", "week", "month"] as AiSubscriptionPlan[]).map(
    (plan) => {
      const priceCents = getPlanPriceCents(creatorId, plan);
      const included = MESSAGE_ALLOWANCE_BY_TIER.standard[plan];
      const days = AI_SUBSCRIPTION_PLAN_DAYS[plan];
      const pl = periodLabel(plan);
      return {
        period: plan,
        periodLabel: pl,
        priceDisplay: formatUsd(priceCents),
        priceCents,
        included,
        unit: "messages",
        payReceiveLine: `You pay ${formatUsd(priceCents)} → You get ${included} text messages for ${pl}`,
        dailyCapNote: `≈ ${Math.round(included / days)} messages/day average · 10 web searches/day included`,
      };
    },
  );

  const quote = getUsageAllowanceQuote("month", "standard");

  return {
    id: "text-subscription",
    category: "Text chat",
    feature: "Platform text pass — every specialist, one at a time",
    unit: "messages",
    plans,
    notIncludedNote:
      "Images, voice talk-back, code sandbox runs, and book chapters are separate add-ons (priced below). " +
      `Learn/chapters use ${quote.learnChaptersApprox} max on a full month if used only for learn · Hive uses 3 messages each.`,
  };
}

export function buildCreditProductPlainPricing(productId: CreditProductId): PlainProductPricing {
  const product = CREDIT_PRODUCTS[productId];
  const plans: PlainPricingPlan[] = product.plans.map((plan) => ({
    period: plan.period,
    periodLabel: periodLabel(plan.period),
    priceDisplay: formatUsd(plan.priceCents),
    priceCents: plan.priceCents,
    included: plan.included,
    unit: product.unit,
    payReceiveLine: `You pay ${formatUsd(plan.priceCents)} → You get ${plan.included} ${product.unit} for ${periodLabel(plan.period)}`,
    dailyCapNote: `Hard stop: max ${product.dailyHardCap} ${product.unit} per day (protects fair use)`,
  }));

  return {
    id: productId,
    category: product.label,
    feature: product.label,
    unit: product.unit,
    dailyHardCap: product.dailyHardCap,
    plans,
    addons: (product.addons ?? []).map((a) => ({
      label: a.label,
      priceDisplay: formatUsd(a.priceCents),
      payReceiveLine: `You pay ${formatUsd(a.priceCents)} → You get +${a.included} ${product.unit} (top-up)`,
    })),
    notIncludedNote: "Does not include text chat — add a text plan if you also need messaging.",
  };
}

/** Add-on credit products relevant to a specialist (for pricing tab). */
export function getSpecialistAddOnProductIds(creatorId: string): CreditProductId[] {
  const ids = new Set<CreditProductId>();

  ids.add("search-web");
  ids.add("hive-consult");
  ids.add("voice-talk");

  if (creatorId === "ai-coder-001") {
    ids.add("code-techbuilder");
    ids.add("code-techbuilder-studio");
  }
  if (creatorId === "ai-game-dev-001") {
    ids.add("code-gameforge");
  }
  if (
    [
      "ai-logo-brand-001",
      "ai-creative-001",
      "ai-author-001",
      "ai-poet-001",
      "ai-songwriter-001",
      "ai-content-helper-001",
      "contentmate",
    ].includes(creatorId)
  ) {
    ids.add("images-imagen");
  }
  if (
    [
      "ai-author-001",
      "ai-poet-001",
      "ai-songwriter-001",
      "ai-blueprint-reader-001",
      "ai-funding-001",
      "ai-cnc-master-001",
      "ai-culinary-001",
    ].includes(creatorId)
  ) {
    ids.add("longform-author");
  }
  ids.add("images-vision");

  return [...ids];
}

/** Full platform catalog for owner / landing transparency. */
export function getPlatformPricingCatalog(): PlainProductPricing[] {
  const creditIds = Object.keys(CREDIT_PRODUCTS) as CreditProductId[];
  const creditProducts = creditIds.map(buildCreditProductPlainPricing);

  const fromRecommended = UR_RECOMMENDED_PRICING.filter(
    (p) => !creditIds.includes(p.id as CreditProductId) && p.id !== "text-standard",
  ).map((p) => ({
    id: p.id,
    category: p.category,
    feature: p.feature,
    unit: "access",
    plans: (
      [
        { period: "day" as const, ...p.prices.day },
        { period: "week" as const, ...p.prices.week },
        { period: "month" as const, ...p.prices.month },
      ] as const
    ).map((row) => ({
      period: row.period,
      periodLabel: periodLabel(row.period),
      priceDisplay: `$${row.usd.toFixed(2)}`,
      priceCents: Math.round(row.usd * 100),
      included: 0,
      unit: "access",
      payReceiveLine: `You pay $${row.usd.toFixed(2)} → You get ${row.cap} (${periodLabel(row.period)})`,
      dailyCapNote: p.prices.other,
    })),
    notIncludedNote: p.notes,
  }));

  return [...creditProducts, ...fromRecommended];
}

export const TEXT_SUB_PLAIN_SUMMARY = {
  includedWithText: [
    `${TEXT_SUB_INCLUDED_WEB_SEARCHES_PER_DAY} web searches per day (while text plan is active)`,
    "Normal chat = 1 message · Mic dictation = 1 message · Learn/chapter = 5 messages · Hive consult = 3 messages",
    "Photo/PDF upload = 2 messages each OR buy vision upload credits",
  ],
  soldSeparately: [
    "Logo & creative images (Imagen)",
    "Voice talk-back minutes",
    "TechBuilder / GameForge code runs",
    "Book/song/script chapter credits",
    "Extra hive consult sessions",
  ],
};

export function formatAllowanceHeadline(creatorId: string, plan: AiSubscriptionPlan): string {
  const included = MESSAGE_ALLOWANCE_BY_TIER.standard[plan];
  const price = formatUsd(getPlanPriceCents(creatorId, plan));
  return `${price} = ${included} messages + ${TEXT_SUB_INCLUDED_WEB_SEARCHES_PER_DAY} searches/day`;
}
