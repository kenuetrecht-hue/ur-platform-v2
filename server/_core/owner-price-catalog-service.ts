/**
 * Live owner price overrides. Defaults come from lib/owner-price-catalog.ts.
 * Only the platform owner (and Steward chatting as the owner) may write.
 */

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { TRPCError } from "@trpc/server";
import { formatUsd, type AiSubscriptionPlan } from "../../lib/ai-subscription-pricing";
import { getAiTalkPack, type AiTalkPackId } from "../../lib/ai-talk-pricing";
import type { Workspace3dPlanId } from "../../lib/workspace-3d-pricing";
import { resolveCreditPurchase, type BillingPeriod, type CreditProductId } from "../../lib/usage-caps-catalog";
import { getRequiredPaymentChannel } from "../../lib/payment-channel-policy";
import {
  OWNER_PRICE_SKU_BY_ID,
  OWNER_PRICE_SKUS,
  creditAddonSkuId,
  creditPlanSkuId,
  dollarsToCents,
  resolveOwnerPriceSkuId,
  type OwnerPriceSku,
} from "../../lib/owner-price-catalog";

type OverrideFile = {
  updatedAt: string;
  overrides: Record<string, number>;
};

const FILE_NAME = "owner-price-overrides.json";
let memory: Record<string, number> = {};
let loaded = false;

function isTestRuntime(): boolean {
  return process.env.VITEST === "true" || process.env.NODE_ENV === "test";
}

function filePath(): string {
  return path.resolve(process.cwd(), "data", FILE_NAME);
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  loaded = true;
  if (isTestRuntime()) return;
  try {
    const raw = await readFile(filePath(), "utf8");
    const parsed = JSON.parse(raw) as OverrideFile;
    if (parsed?.overrides && typeof parsed.overrides === "object") {
      memory = { ...parsed.overrides };
    }
  } catch {
    memory = {};
  }
}

async function persist(): Promise<void> {
  if (isTestRuntime()) return;
  const dir = path.resolve(process.cwd(), "data");
  await mkdir(dir, { recursive: true });
  const body: OverrideFile = {
    updatedAt: new Date().toISOString(),
    overrides: memory,
  };
  await writeFile(filePath(), `${JSON.stringify(body, null, 2)}\n`, "utf8");
}

export function _resetOwnerPriceCatalogForTests(): void {
  memory = {};
  loaded = true;
}

export async function getLivePriceCents(skuId: string): Promise<number> {
  await ensureLoaded();
  const sku = OWNER_PRICE_SKU_BY_ID[skuId];
  if (!sku) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Unknown price item." });
  }
  const override = memory[skuId];
  if (typeof override === "number" && Number.isFinite(override)) {
    return override;
  }
  return sku.defaultCents;
}

export function getLivePriceCentsSync(skuId: string): number {
  const sku = OWNER_PRICE_SKU_BY_ID[skuId];
  if (!sku) return 0;
  const override = memory[skuId];
  if (typeof override === "number" && Number.isFinite(override)) return override;
  return sku.defaultCents;
}

export async function liveTextPassCents(plan: AiSubscriptionPlan): Promise<number> {
  return getLivePriceCents(`text.${plan}`);
}

export async function liveSlotCents(plan: AiSubscriptionPlan): Promise<number> {
  return getLivePriceCents(`slot.${plan}`);
}

export async function liveTalkPack(packId: AiTalkPackId) {
  const pack = getAiTalkPack(packId);
  const priceCents = await getLivePriceCents(`talk.${packId}`);
  return {
    ...pack,
    priceCents,
    requiredPaymentChannel: getRequiredPaymentChannel(priceCents),
  };
}

export async function liveWorkspacePlanCents(planId: Workspace3dPlanId): Promise<number> {
  return getLivePriceCents(`workspace.${planId}`);
}

export async function liveWorkspaceExtraSlotCents(): Promise<number> {
  return getLivePriceCents("workspace.extra_ai_slot");
}

export async function liveCreditQuote(params: {
  productId: CreditProductId;
  period?: BillingPeriod;
  addonId?: string;
}) {
  const resolved = resolveCreditPurchase(params);
  if (!resolved) return null;
  const skuId = params.addonId
    ? creditAddonSkuId(params.productId, params.addonId)
    : creditPlanSkuId(params.productId, params.period ?? "month");
  const priceCents = await getLivePriceCents(skuId);
  return { ...resolved, priceCents };
}

export type OwnerPriceRow = OwnerPriceSku & {
  liveCents: number;
  liveDisplay: string;
  defaultDisplay: string;
  isOverride: boolean;
  appStoreFiveDollarWarning: boolean;
};

export async function listOwnerPriceCatalog(): Promise<OwnerPriceRow[]> {
  await ensureLoaded();
  return OWNER_PRICE_SKUS.map((sku) => {
    const liveCents = getLivePriceCentsSync(sku.id);
    return {
      ...sku,
      liveCents,
      liveDisplay: formatUsd(liveCents),
      defaultDisplay: formatUsd(sku.defaultCents),
      isOverride: liveCents !== sku.defaultCents,
      appStoreFiveDollarWarning: sku.id === "talk.talk_5" && liveCents !== 500,
    };
  });
}

export async function setOwnerPriceSku(params: {
  skuId: string;
  priceCents: number;
}): Promise<OwnerPriceRow> {
  await ensureLoaded();
  const sku = OWNER_PRICE_SKU_BY_ID[params.skuId];
  if (!sku) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Unknown price item." });
  }
  const cents = Math.round(params.priceCents);
  if (cents < sku.minCents || cents > sku.maxCents) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Price must be between ${formatUsd(sku.minCents)} and ${formatUsd(sku.maxCents)}.`,
    });
  }
  if (cents === sku.defaultCents) {
    delete memory[sku.id];
  } else {
    memory[sku.id] = cents;
  }
  await persist();
  const rows = await listOwnerPriceCatalog();
  return rows.find((row) => row.id === sku.id)!;
}

export async function resetOwnerPriceSku(skuId: string): Promise<OwnerPriceRow> {
  await ensureLoaded();
  if (!OWNER_PRICE_SKU_BY_ID[skuId]) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Unknown price item." });
  }
  delete memory[skuId];
  await persist();
  const rows = await listOwnerPriceCatalog();
  return rows.find((row) => row.id === skuId)!;
}

export type OwnerPriceCommandResult = {
  skuId: string;
  label: string;
  previousCents: number;
  liveCents: number;
  liveDisplay: string;
  appStoreFiveDollarWarning: boolean;
  reset: boolean;
};

function commandSkuOrThrow(raw: string): string {
  const skuId = resolveOwnerPriceSkuId(raw);
  if (!skuId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "I do not recognize that product. Use an id like text.month or talk.talk_200. Open Price catalog in Administration to see every item.",
    });
  }
  return skuId;
}

export function looksLikeOwnerPriceCommand(message: string): boolean {
  return /^(?:set\s+price|reset\s+price|\/price\s+set|\/price\s+reset)\b/i.test(message.trim());
}
export async function tryApplyOwnerPriceCommand(message: string): Promise<OwnerPriceCommandResult | null> {
  const trimmed = message.trim();
  const resetMatch = trimmed.match(/^(?:reset\s+price|\/price\s+reset)\s+(.+?)\s*$/i);
  if (resetMatch) {
    const skuId = commandSkuOrThrow(resetMatch[1] ?? "");
    const previousCents = await getLivePriceCents(skuId);
    const row = await resetOwnerPriceSku(skuId);
    return {
      skuId: row.id,
      label: row.label,
      previousCents,
      liveCents: row.liveCents,
      liveDisplay: row.liveDisplay,
      appStoreFiveDollarWarning: row.appStoreFiveDollarWarning,
      reset: true,
    };
  }

  const match = trimmed.match(
    /^(?:set\s+price|\/price\s+set)\s+(.+?)\s+\$?(\d+(?:\.\d{1,2})?)\s*$/i,
  );
  if (!match) return null;

  const skuId = commandSkuOrThrow(match[1] ?? "");
  const dollars = Number(match[2]);
  if (!Number.isFinite(dollars)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "That price is not a number." });
  }
  const previousCents = await getLivePriceCents(skuId);
  const row = await setOwnerPriceSku({ skuId, priceCents: dollarsToCents(dollars) });
  return {
    skuId: row.id,
    label: row.label,
    previousCents,
    liveCents: row.liveCents,
    liveDisplay: row.liveDisplay,
    appStoreFiveDollarWarning: row.appStoreFiveDollarWarning,
    reset: false,
  };
}

export function formatOwnerPriceCommandReply(result: OwnerPriceCommandResult): string {
  const previous = formatUsd(result.previousCents);
  const lines = [
    result.reset ? "Store price reset to default." : "Live store price updated.",
    "",
    `${result.label} is now ${result.liveDisplay} (was ${previous}).`,
    "Checkout uses this amount right away. People who already paid keep what they bought.",
  ];
  if (result.appStoreFiveDollarWarning) {
    lines.push(
      "",
      "Note: the 20-minute talk pack is no longer exactly $5.00, so it checks out on the website instead of the mobile app.",
    );
  }
  return lines.join("\n");
}
