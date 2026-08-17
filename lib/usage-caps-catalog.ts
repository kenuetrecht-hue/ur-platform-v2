/**
 * Numeric usage caps + precise upgrade paths (owner-approved Aug 2026).
 * Single source of truth for profitability limits and upgrade copy.
 */

import type { AiPriceTier, AiSubscriptionPlan } from "./ai-subscription-pricing";
import { getPlanPriceCents, formatUsd } from "./ai-subscription-pricing";
import { usdToCents } from "./ur-recommended-pricing";

export type BillingPeriod = "day" | "week" | "month";

export type CreditProductId =
  | "images-imagen"
  | "images-vision"
  | "code-techbuilder"
  | "code-techbuilder-studio"
  | "code-gameforge"
  | "longform-author"
  | "search-web"
  | "hive-consult"
  | "voice-talk";

export type CreditUnit =
  | "messages"
  | "images"
  | "uploads"
  | "code runs"
  | "publish attempts"
  | "chapters"
  | "searches"
  | "hive sessions"
  | "talk minutes";

export type PlanCap = {
  period: BillingPeriod;
  priceCents: number;
  included: number;
  durationDays: number;
};

export type CreditProductDef = {
  id: CreditProductId;
  label: string;
  unit: CreditUnit;
  /** Hard daily stop — protects API burn even on monthly plans */
  dailyHardCap: number;
  plans: PlanCap[];
  addons?: Array<{ id: string; label: string; priceCents: number; included: number }>;
};

/** Text message allowances per tier (aligned with ur-recommended-pricing). */
export const MESSAGE_ALLOWANCE_BY_TIER: Record<
  AiPriceTier,
  Record<AiSubscriptionPlan, number>
> = {
  standard: { day: 35, week: 130, month: 350 },
  professional: { day: 25, week: 90, month: 200 },
  premium: { day: 28, week: 100, month: 220 },
};

/** Included web searches per day when user has any active text subscription. */
export const TEXT_SUB_INCLUDED_WEB_SEARCHES_PER_DAY = 10;

export const LEARN_MODE_MESSAGE_UNITS = 5;
export const HIVE_MESSAGE_UNITS = 3;
export const VISION_UPLOAD_MESSAGE_UNITS = 2;

export const CREDIT_PRODUCTS: Record<CreditProductId, CreditProductDef> = {
  "images-imagen": {
    id: "images-imagen",
    label: "Logo & creative images",
    unit: "images",
    dailyHardCap: 25,
    plans: [
      { period: "day", priceCents: 399, included: 5, durationDays: 1 },
      { period: "week", priceCents: 1099, included: 20, durationDays: 7 },
      { period: "month", priceCents: 2499, included: 60, durationDays: 30 },
    ],
    addons: [
      { id: "image_single", label: "1 image", priceCents: 99, included: 1 },
      { id: "image_bulk_15", label: "15 images", priceCents: 999, included: 15 },
    ],
  },
  "images-vision": {
    id: "images-vision",
    label: "Photo & PDF analysis",
    unit: "uploads",
    dailyHardCap: 10,
    plans: [
      { period: "day", priceCents: 299, included: 5, durationDays: 1 },
      { period: "week", priceCents: 799, included: 18, durationDays: 7 },
      { period: "month", priceCents: 1499, included: 50, durationDays: 30 },
    ],
  },
  "code-techbuilder": {
    id: "code-techbuilder",
    label: "TechBuilder code runs",
    unit: "code runs",
    dailyHardCap: 50,
    plans: [
      { period: "day", priceCents: 599, included: 10, durationDays: 1 },
      { period: "week", priceCents: 1599, included: 35, durationDays: 7 },
      { period: "month", priceCents: 2999, included: 150, durationDays: 30 },
    ],
    addons: [
      { id: "deploy_single", label: "1 deploy/export", priceCents: 299, included: 1 },
      { id: "deploy_10", label: "10 deploy/exports", priceCents: 1999, included: 10 },
    ],
  },
  "code-techbuilder-studio": {
    id: "code-techbuilder-studio",
    label: "TechBuilder Studio runs",
    unit: "code runs",
    dailyHardCap: 80,
    plans: [
      { period: "day", priceCents: 1099, included: 25, durationDays: 1 },
      { period: "week", priceCents: 2799, included: 80, durationDays: 7 },
      { period: "month", priceCents: 6499, included: 400, durationDays: 30 },
    ],
  },
  "code-gameforge": {
    id: "code-gameforge",
    label: "GameForge publish attempts",
    unit: "publish attempts",
    dailyHardCap: 10,
    plans: [
      { period: "day", priceCents: 499, included: 3, durationDays: 1 },
      { period: "week", priceCents: 1299, included: 10, durationDays: 7 },
      { period: "month", priceCents: 2499, included: 30, durationDays: 30 },
    ],
  },
  "longform-author": {
    id: "longform-author",
    label: "Book / song / script chapters",
    unit: "chapters",
    dailyHardCap: 3,
    plans: [
      { period: "day", priceCents: 599, included: 2, durationDays: 1 },
      { period: "week", priceCents: 1299, included: 8, durationDays: 7 },
      { period: "month", priceCents: 2499, included: 25, durationDays: 30 },
    ],
    addons: [
      { id: "chapter_single", label: "1 chapter", priceCents: 299, included: 1 },
      { id: "chapter_5", label: "5 chapters", priceCents: 1299, included: 5 },
    ],
  },
  "search-web": {
    id: "search-web",
    label: "Web search + citations",
    unit: "searches",
    dailyHardCap: 50,
    plans: [
      { period: "day", priceCents: 299, included: 15, durationDays: 1 },
      { period: "week", priceCents: 799, included: 50, durationDays: 7 },
      { period: "month", priceCents: 1499, included: 150, durationDays: 30 },
    ],
    addons: [{ id: "search_50", label: "+50 searches", priceCents: 499, included: 50 }],
  },
  "hive-consult": {
    id: "hive-consult",
    label: "Hive multi-AI consults",
    unit: "hive sessions",
    dailyHardCap: 5,
    plans: [
      { period: "day", priceCents: 399, included: 3, durationDays: 1 },
      { period: "week", priceCents: 1099, included: 12, durationDays: 7 },
      { period: "month", priceCents: 1999, included: 40, durationDays: 30 },
    ],
  },
  "voice-talk": {
    id: "voice-talk",
    label: "Voice talk-back",
    unit: "talk minutes",
    dailyHardCap: 60,
    plans: [
      { period: "day", priceCents: 499, included: 8, durationDays: 1 },
      { period: "week", priceCents: 1299, included: 25, durationDays: 7 },
      { period: "month", priceCents: 2999, included: 70, durationDays: 30 },
    ],
    addons: [
      { id: "talk_12", label: "12 talk minutes", priceCents: 499, included: 12 },
      { id: "talk_40", label: "40 talk minutes", priceCents: 1499, included: 40 },
    ],
  },
};

export type UpgradeOption = {
  productId: CreditProductId | "text-subscription";
  period: BillingPeriod | "addon";
  addonId?: string;
  label: string;
  priceCents: number;
  priceDisplay: string;
  included: number;
  unit: CreditUnit | "messages";
  dailyHardCap?: number;
  /** e.g. "+15 images vs your day plan" */
  upgradeDetail: string;
};

function periodLabel(period: BillingPeriod): string {
  if (period === "day") return "24-hour";
  if (period === "week") return "7-day";
  return "30-day";
}

export function getCreditUpgradeOptions(params: {
  productId: CreditProductId;
  currentPeriod?: BillingPeriod | null;
  currentRemaining?: number;
}): UpgradeOption[] {
  const product = CREDIT_PRODUCTS[params.productId];
  const options: UpgradeOption[] = [];
  const currentPlan = params.currentPeriod
    ? product.plans.find((p) => p.period === params.currentPeriod)
    : null;

  for (const plan of product.plans) {
    const extra =
      currentPlan && plan.included > currentPlan.included
        ? `+${plan.included - currentPlan.included} ${product.unit}`
        : `${plan.included} ${product.unit}`;
    options.push({
      productId: params.productId,
      period: plan.period,
      label: `${periodLabel(plan.period)} plan`,
      priceCents: plan.priceCents,
      priceDisplay: formatUsd(plan.priceCents),
      included: plan.included,
      unit: product.unit,
      dailyHardCap: product.dailyHardCap,
      upgradeDetail: currentPlan
        ? `${extra} (${formatUsd(plan.priceCents)} vs ${formatUsd(currentPlan.priceCents)})`
        : `${plan.included} ${product.unit} · max ${product.dailyHardCap}/${product.unit.includes("minute") ? "day" : "day"}`,
    });
  }

  for (const addon of product.addons ?? []) {
    options.push({
      productId: params.productId,
      period: "addon",
      addonId: addon.id,
      label: addon.label,
      priceCents: addon.priceCents,
      priceDisplay: formatUsd(addon.priceCents),
      included: addon.included,
      unit: product.unit,
      upgradeDetail: `Top-up: +${addon.included} ${product.unit} for ${formatUsd(addon.priceCents)}`,
    });
  }

  return options;
}

export function getTextSubscriptionUpgradeOptions(params: {
  tier: AiPriceTier;
  creatorId: string;
  currentPlan?: AiSubscriptionPlan | null;
  messagesRemaining?: number;
}): UpgradeOption[] {
  const plans: AiSubscriptionPlan[] = ["day", "week", "month"];
  const currentIncluded = params.currentPlan
    ? MESSAGE_ALLOWANCE_BY_TIER[params.tier][params.currentPlan]
    : 0;

  return plans.map((plan) => {
    const included = MESSAGE_ALLOWANCE_BY_TIER[params.tier][plan];
    const priceCents = getPlanPriceCents(params.creatorId, plan);
    const extra =
      currentIncluded > 0 && included > currentIncluded
        ? `+${included - currentIncluded} messages`
        : `${included} messages`;
    return {
      productId: "text-subscription" as const,
      period: plan,
      label: `${periodLabel(plan)} text plan`,
      priceCents,
      priceDisplay: formatUsd(priceCents),
      included,
      unit: "messages" as const,
      upgradeDetail:
        params.currentPlan && plan === params.currentPlan
          ? `${params.messagesRemaining ?? 0} messages left on current plan`
          : `${extra} · ${formatUsd(priceCents)}`,
    };
  });
}

export function buildUsageLimitMessage(params: {
  productLabel: string;
  unit: CreditUnit | "messages";
  remaining: number;
  upgradeOptions: UpgradeOption[];
}): string {
  const top = params.upgradeOptions.slice(0, 3);
  const lines = top.map(
    (o) => `• ${o.label} — ${o.priceDisplay}: ${o.upgradeDetail}`,
  );
  return [
    `${params.productLabel} limit reached (${params.remaining} ${params.unit} left).`,
    "Upgrade for more:",
    ...lines,
    "Purchase in Pricing or Owner Ops → Usage upgrades.",
  ].join("\n");
}

export function resolveCreditPurchase(params: {
  productId: CreditProductId;
  period?: BillingPeriod;
  addonId?: string;
}): { priceCents: number; included: number; durationDays: number; label: string } | null {
  const product = CREDIT_PRODUCTS[params.productId];
  if (params.addonId) {
    const addon = product.addons?.find((a) => a.id === params.addonId);
    if (!addon) return null;
    return {
      priceCents: addon.priceCents,
      included: addon.included,
      durationDays: 30,
      label: addon.label,
    };
  }
  if (!params.period) return null;
  const plan = product.plans.find((p) => p.period === params.period);
  if (!plan) return null;
  return {
    priceCents: plan.priceCents,
    included: plan.included,
    durationDays: plan.durationDays,
    label: `${product.label} (${periodLabel(plan.period)})`,
  };
}

/** Social post assistant caps (aligned with recommended pricing). */
export const SOCIAL_ASSIST_CAP_BY_PLAN: Record<BillingPeriod | "year", number> = {
  day: 5,
  week: 20,
  month: 80,
  year: 900,
};

export const SOCIAL_ASSIST_PRICE_CENTS: Record<BillingPeriod | "year", number> = {
  day: usdToCents(2.49),
  week: usdToCents(6.99),
  month: usdToCents(11.99),
  year: usdToCents(49.99),
};
