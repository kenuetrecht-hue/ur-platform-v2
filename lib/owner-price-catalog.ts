/**
 * Owner-editable price catalog — defaults match checkout constants.
 * Live overrides live on the server (data/owner-price-overrides.json).
 */

import { PLATFORM_PASS_CENTS, CONCURRENT_AI_SLOT_CENTS } from "./ai-subscription-pricing";
import { AI_TALK_PACKS } from "./ai-talk-pricing";
import { WORKSPACE_3D_EXTRA_AI_SLOT_CENTS, WORKSPACE_3D_PLAN_CENTS } from "./workspace-3d-pricing";
import { CREDIT_PRODUCTS } from "./usage-caps-catalog";

export type OwnerPriceCategory =
  | "text_pass"
  | "concurrent_slot"
  | "talk"
  | "workspace_3d"
  | "credits";

export type OwnerPriceSku = {
  id: string;
  category: OwnerPriceCategory;
  label: string;
  defaultCents: number;
  minCents: number;
  maxCents: number;
  note?: string;
};

export const OWNER_PRICE_MIN_CENTS = 50;
export const OWNER_PRICE_MAX_CENTS = 100_000;

export function creditPlanSkuId(productId: string, period: string): string {
  return `credit.${productId}.${period}`;
}

export function creditAddonSkuId(productId: string, addonId: string): string {
  return `credit.${productId}.addon.${addonId}`;
}

export function buildDefaultOwnerPriceSkus(): OwnerPriceSku[] {
  const skus: OwnerPriceSku[] = [
    {
      id: "text.day",
      category: "text_pass",
      label: "Text pass — 24 hours",
      defaultCents: PLATFORM_PASS_CENTS.day,
      minCents: OWNER_PRICE_MIN_CENTS,
      maxCents: OWNER_PRICE_MAX_CENTS,
    },
    {
      id: "text.week",
      category: "text_pass",
      label: "Text pass — weekly",
      defaultCents: PLATFORM_PASS_CENTS.week,
      minCents: OWNER_PRICE_MIN_CENTS,
      maxCents: OWNER_PRICE_MAX_CENTS,
    },
    {
      id: "text.month",
      category: "text_pass",
      label: "Text pass — monthly",
      defaultCents: PLATFORM_PASS_CENTS.month,
      minCents: OWNER_PRICE_MIN_CENTS,
      maxCents: OWNER_PRICE_MAX_CENTS,
    },
    {
      id: "slot.day",
      category: "concurrent_slot",
      label: "Extra concurrent AI — 24 hours",
      defaultCents: CONCURRENT_AI_SLOT_CENTS.day,
      minCents: OWNER_PRICE_MIN_CENTS,
      maxCents: OWNER_PRICE_MAX_CENTS,
    },
    {
      id: "slot.week",
      category: "concurrent_slot",
      label: "Extra concurrent AI — weekly",
      defaultCents: CONCURRENT_AI_SLOT_CENTS.week,
      minCents: OWNER_PRICE_MIN_CENTS,
      maxCents: OWNER_PRICE_MAX_CENTS,
    },
    {
      id: "slot.month",
      category: "concurrent_slot",
      label: "Extra concurrent AI — monthly",
      defaultCents: CONCURRENT_AI_SLOT_CENTS.month,
      minCents: OWNER_PRICE_MIN_CENTS,
      maxCents: OWNER_PRICE_MAX_CENTS,
    },
  ];

  for (const pack of Object.values(AI_TALK_PACKS)) {
    skus.push({
      id: `talk.${pack.id}`,
      category: "talk",
      label: `${pack.label} (${pack.totalMinutes} min)`,
      defaultCents: pack.priceCents,
      minCents: OWNER_PRICE_MIN_CENTS,
      maxCents: OWNER_PRICE_MAX_CENTS,
      note:
        pack.id === "talk_5"
          ? "Exactly $5.00 stays on the mobile app. Any other amount checks out on the website."
          : "Web browser checkout",
    });
  }

  skus.push(
    {
      id: "workspace.day_pass",
      category: "workspace_3d",
      label: "3D lab — Day Pass",
      defaultCents: WORKSPACE_3D_PLAN_CENTS.day_pass,
      minCents: OWNER_PRICE_MIN_CENTS,
      maxCents: OWNER_PRICE_MAX_CENTS,
    },
    {
      id: "workspace.solo",
      category: "workspace_3d",
      label: "3D lab — Solo",
      defaultCents: WORKSPACE_3D_PLAN_CENTS.solo,
      minCents: OWNER_PRICE_MIN_CENTS,
      maxCents: OWNER_PRICE_MAX_CENTS,
    },
    {
      id: "workspace.pro",
      category: "workspace_3d",
      label: "3D lab — Pro",
      defaultCents: WORKSPACE_3D_PLAN_CENTS.pro,
      minCents: OWNER_PRICE_MIN_CENTS,
      maxCents: OWNER_PRICE_MAX_CENTS,
    },
    {
      id: "workspace.studio",
      category: "workspace_3d",
      label: "3D lab — Studio",
      defaultCents: WORKSPACE_3D_PLAN_CENTS.studio,
      minCents: OWNER_PRICE_MIN_CENTS,
      maxCents: OWNER_PRICE_MAX_CENTS,
    },
    {
      id: "workspace.extra_ai_slot",
      category: "workspace_3d",
      label: "3D lab — extra AI slot",
      defaultCents: WORKSPACE_3D_EXTRA_AI_SLOT_CENTS,
      minCents: OWNER_PRICE_MIN_CENTS,
      maxCents: OWNER_PRICE_MAX_CENTS,
    },
  );

  for (const product of Object.values(CREDIT_PRODUCTS)) {
    for (const plan of product.plans) {
      skus.push({
        id: creditPlanSkuId(product.id, plan.period),
        category: "credits",
        label: `${product.label} — ${plan.period}`,
        defaultCents: plan.priceCents,
        minCents: OWNER_PRICE_MIN_CENTS,
        maxCents: OWNER_PRICE_MAX_CENTS,
      });
    }
    for (const addon of product.addons ?? []) {
      skus.push({
        id: creditAddonSkuId(product.id, addon.id),
        category: "credits",
        label: `${product.label} — ${addon.label}`,
        defaultCents: addon.priceCents,
        minCents: OWNER_PRICE_MIN_CENTS,
        maxCents: OWNER_PRICE_MAX_CENTS,
      });
    }
  }

  return skus;
}

export const OWNER_PRICE_SKUS = buildDefaultOwnerPriceSkus();

export const OWNER_PRICE_SKU_BY_ID: Record<string, OwnerPriceSku> = Object.fromEntries(
  OWNER_PRICE_SKUS.map((sku) => [sku.id, sku]),
);

/** Phrases the owner / Steward can use in chat: SET PRICE monthly text 29.99 */
export const OWNER_PRICE_ALIASES: Record<string, string> = {
  "text.day": "text.day",
  "daily text": "text.day",
  "text day": "text.day",
  "day pass": "text.day",
  "text.week": "text.week",
  "weekly text": "text.week",
  "text week": "text.week",
  "text.month": "text.month",
  "monthly text": "text.month",
  "text month": "text.month",
  "text pass": "text.month",
  "monthly pass": "text.month",
  "slot.day": "slot.day",
  "slot.week": "slot.week",
  "slot.month": "slot.month",
  "talk.talk_1": "talk.talk_1",
  "$1 talk": "talk.talk_1",
  "talk 1": "talk.talk_1",
  "talk.talk_5": "talk.talk_5",
  "$5 talk": "talk.talk_5",
  "talk 5": "talk.talk_5",
  "25 minute talk": "talk.talk_5",
  "20 minute talk": "talk.talk_5",
  "talk.talk_120": "talk.talk_120",
  "$120 talk": "talk.talk_120",
  "500 minute": "talk.talk_120",
  "500 minutes": "talk.talk_120",
  "talk.talk_200": "talk.talk_200",
  "$200 talk": "talk.talk_200",
  "1000 minute": "talk.talk_200",
  "1,000 minute": "talk.talk_200",
  "1000 minutes": "talk.talk_200",
  "workspace.pro": "workspace.pro",
  "3d pro": "workspace.pro",
  "3d solo": "workspace.solo",
  "workspace.solo": "workspace.solo",
  "3d studio": "workspace.studio",
  "workspace.studio": "workspace.studio",
  "3d day": "workspace.day_pass",
  "workspace.day_pass": "workspace.day_pass",
  "workspace.extra_ai_slot": "workspace.extra_ai_slot",
  "3d extra slot": "workspace.extra_ai_slot",
  "extra 3d slot": "workspace.extra_ai_slot",
  "extra concurrent slot": "slot.month",
  "monthly slot": "slot.month",
  "weekly slot": "slot.week",
  "daily slot": "slot.day",
};

export function resolveOwnerPriceSkuId(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (OWNER_PRICE_SKU_BY_ID[trimmed]) return trimmed;
  if (OWNER_PRICE_ALIASES[trimmed]) return OWNER_PRICE_ALIASES[trimmed];
  return null;
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}
