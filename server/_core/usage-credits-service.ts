/**
 * Usage credit lots — hard caps + daily limits for profitable API metering.
 */

import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import {
  type BillingPeriod,
  type CreditProductId,
  CREDIT_PRODUCTS,
  buildUsageLimitMessage,
  getCreditUpgradeOptions,
  resolveCreditPurchase,
  TEXT_SUB_INCLUDED_WEB_SEARCHES_PER_DAY,
} from "../../lib/usage-caps-catalog";
import { recordTransaction } from "./transaction-ledger-service";
import { getActiveAiSubscription } from "./ai-subscription-service";
import {
  buildUsageLotTrackerView,
  formatUsedLeftLine,
  type UsageLotTrackerView,
} from "../../lib/usage-lot-tracker";

export type CreditLot = {
  id: string;
  userId: string;
  productId: CreditProductId;
  period: BillingPeriod | "addon";
  included: number;
  used: number;
  purchasedAt: string;
  expiresAt: string;
  priceCents: number;
  label: string;
};

const creditLots = new Map<string, CreditLot>();
/** `${userId}:${productId}:${YYYY-MM-DD}` */
const dailyUsage = new Map<string, number>();
/** `${userId}:web_search_included:${YYYY-MM-DD}` */
const includedWebSearchDaily = new Map<string, number>();

function dayKey(userId: string, productId: CreditProductId | "web_search_included"): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return `${userId}:${productId}:${ymd}`;
}

function unexpiredLots(userId: string, productId?: CreditProductId): CreditLot[] {
  const now = Date.now();
  return [...creditLots.values()]
    .filter(
      (lot) =>
        lot.userId === userId &&
        (!productId || lot.productId === productId) &&
        new Date(lot.expiresAt).getTime() > now,
    )
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
}

function activeLots(userId: string, productId: CreditProductId): CreditLot[] {
  return unexpiredLots(userId, productId).filter((lot) => lot.used < lot.included);
}

export function listCreditLotTrackers(
  userId: string,
  productId: CreditProductId,
): UsageLotTrackerView[] {
  const product = CREDIT_PRODUCTS[productId];
  return unexpiredLots(userId, productId).map((lot) =>
    buildUsageLotTrackerView({
      id: lot.id,
      productId: lot.productId,
      productLabel: lot.label || product.label,
      unit: product.unit,
      included: lot.included,
      used: lot.used,
      expiresAt: lot.expiresAt,
    }),
  );
}

export function getCreditBalance(userId: string, productId: CreditProductId): {
  productId: CreditProductId;
  label: string;
  unit: string;
  remaining: number;
  included: number;
  used: number;
  dailyHardCap: number;
  usedToday: number;
  dailyRemaining: number;
  activePeriod: BillingPeriod | "addon" | null;
  expiresAt: string | null;
  lots: UsageLotTrackerView[];
  usedLeftLine: string;
} {
  const product = CREDIT_PRODUCTS[productId];
  const spendable = activeLots(userId, productId);
  const tracked = unexpiredLots(userId, productId);
  const remaining = spendable.reduce((sum, lot) => sum + (lot.included - lot.used), 0);
  const included = tracked.reduce((sum, lot) => sum + lot.included, 0);
  const used = tracked.reduce((sum, lot) => sum + lot.used, 0);
  const usedToday = dailyUsage.get(dayKey(userId, productId)) ?? 0;
  const dailyRemaining = Math.max(0, product.dailyHardCap - usedToday);
  const primary = spendable[0] ?? tracked[0];
  const lots = listCreditLotTrackers(userId, productId);

  return {
    productId,
    label: product.label,
    unit: product.unit,
    remaining: Math.min(remaining, dailyRemaining),
    included,
    used,
    dailyHardCap: product.dailyHardCap,
    usedToday,
    dailyRemaining,
    activePeriod: primary?.period ?? null,
    expiresAt: primary?.expiresAt ?? null,
    lots,
    usedLeftLine: formatUsedLeftLine({
      used,
      included,
      remaining: Math.min(remaining, dailyRemaining),
      unit: product.unit,
    }),
  };
}

export function getAllCreditBalances(userId: string) {
  return (Object.keys(CREDIT_PRODUCTS) as CreditProductId[]).map((id) =>
    getCreditBalance(userId, id),
  );
}

export function grantCreditLot(params: {
  userId: string;
  productId: CreditProductId;
  period?: BillingPeriod;
  addonId?: string;
  priceCents?: number;
  source?: string;
}): CreditLot {
  const resolved = resolveCreditPurchase({
    productId: params.productId,
    period: params.period,
    addonId: params.addonId,
  });
  if (!resolved) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid credit purchase." });
  }

  const now = new Date();
  const expires = new Date(now.getTime() + resolved.durationDays * 24 * 60 * 60 * 1000);
  const lot: CreditLot = {
    id: `credit-${randomUUID().slice(0, 12)}`,
    userId: params.userId,
    productId: params.productId,
    period: params.addonId ? "addon" : (params.period ?? "month"),
    included: resolved.included,
    used: 0,
    purchasedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    priceCents: params.priceCents ?? resolved.priceCents,
    label: resolved.label,
  };
  creditLots.set(lot.id, lot);

  void recordTransaction({
    payerUserId: params.userId,
    type: "other",
    amountCents: lot.priceCents,
    description: `${lot.label} — ${lot.included} ${CREDIT_PRODUCTS[params.productId].unit}`,
    metadata: {
      kind: "usage_credit_purchase",
      productId: params.productId,
      period: lot.period,
      included: lot.included,
      source: params.source ?? "simulated",
    },
  });

  return lot;
}

function incrementDaily(userId: string, productId: CreditProductId, units: number): void {
  const key = dayKey(userId, productId);
  dailyUsage.set(key, (dailyUsage.get(key) ?? 0) + units);
}

function throwLimitError(userId: string, productId: CreditProductId, remaining: number): never {
  const product = CREDIT_PRODUCTS[productId];
  const balance = getCreditBalance(userId, productId);
  const options = getCreditUpgradeOptions({
    productId,
    currentPeriod: balance.activePeriod && balance.activePeriod !== "addon" ? balance.activePeriod : null,
    currentRemaining: remaining,
  });
  throw new TRPCError({
    code: "FORBIDDEN",
    message: buildUsageLimitMessage({
      productLabel: product.label,
      unit: product.unit,
      remaining,
      upgradeOptions: options,
    }),
  });
}

/** Consumes one or more credits; throws with upgrade path when capped. */
export function assertAndConsumeCredit(params: {
  userId: string;
  productId: CreditProductId;
  units?: number;
  isPlatformOwner?: boolean;
}): { remaining: number; consumed: number } {
  const units = params.units ?? 1;
  if (params.isPlatformOwner) {
    return { remaining: 999_999, consumed: units };
  }

  const product = CREDIT_PRODUCTS[params.productId];
  const usedToday = dailyUsage.get(dayKey(params.userId, params.productId)) ?? 0;
  if (usedToday + units > product.dailyHardCap) {
    throwLimitError(params.userId, params.productId, 0);
  }

  const lots = activeLots(params.userId, params.productId).sort(
    (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
  );
  let remainingUnits = units;
  for (const lot of lots) {
    const available = lot.included - lot.used;
    if (available <= 0) continue;
    const take = Math.min(available, remainingUnits);
    lot.used += take;
    creditLots.set(lot.id, lot);
    remainingUnits -= take;
    if (remainingUnits <= 0) break;
  }

  if (remainingUnits > 0) {
    const balance = getCreditBalance(params.userId, params.productId);
    throwLimitError(params.userId, params.productId, balance.remaining);
  }

  incrementDaily(params.userId, params.productId, units);
  const after = getCreditBalance(params.userId, params.productId);
  return { remaining: after.remaining, consumed: units };
}

/** Web search: 10/day included with any active text sub, else search-web credits. */
export function assertAndConsumeWebSearch(params: {
  userId: string;
  creatorId: string;
  isPlatformOwner?: boolean;
}): void {
  if (params.isPlatformOwner) return;

  const sub = getActiveAiSubscription(params.userId, params.creatorId);
  if (sub) {
    const key = dayKey(params.userId, "web_search_included");
    const used = includedWebSearchDaily.get(key) ?? 0;
    if (used < TEXT_SUB_INCLUDED_WEB_SEARCHES_PER_DAY) {
      includedWebSearchDaily.set(key, used + 1);
      return;
    }
  }

  assertAndConsumeCredit({
    userId: params.userId,
    productId: "search-web",
    units: 1,
    isPlatformOwner: false,
  });
}

export function getIncludedWebSearchRemaining(userId: string, creatorId: string): number {
  const sub = getActiveAiSubscription(userId, creatorId);
  if (!sub) return 0;
  const used = includedWebSearchDaily.get(dayKey(userId, "web_search_included")) ?? 0;
  return Math.max(0, TEXT_SUB_INCLUDED_WEB_SEARCHES_PER_DAY - used);
}

export function _clearUsageCreditsForTests(): void {
  creditLots.clear();
  dailyUsage.clear();
  includedWebSearchDaily.clear();
}

/** Grant credits from loyalty redemption (no cash transaction). */
export function grantLoyaltyCreditLot(params: {
  userId: string;
  productId: CreditProductId;
  included: number;
  label: string;
}): CreditLot {
  const product = CREDIT_PRODUCTS[params.productId];
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const lot: CreditLot = {
    id: `credit-loyalty-${randomUUID().slice(0, 12)}`,
    userId: params.userId,
    productId: params.productId,
    period: "addon",
    included: params.included,
    used: 0,
    purchasedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    priceCents: 0,
    label: params.label,
  };
  creditLots.set(lot.id, lot);
  return lot;
}

/** Returns true when credits were available and consumed. */
export function tryConsumeCredit(params: {
  userId: string;
  productId: CreditProductId;
  units?: number;
  isPlatformOwner?: boolean;
}): boolean {
  try {
    assertAndConsumeCredit(params);
    return true;
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      return false;
    }
    throw error;
  }
}

export function sandboxRunProductForTier(tierId: string): CreditProductId {
  return tierId === "studio" || tierId === "enterprise"
    ? "code-techbuilder-studio"
    : "code-techbuilder";
}
