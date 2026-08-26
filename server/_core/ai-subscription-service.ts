/**
 * Platform text pass — day / week / month unlocks every UR specialist, one at a time.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  type AiSubscriptionPlan,
  AI_SUBSCRIPTION_PLAN_DAYS,
  PLATFORM_PASS_ID,
  applyCreatorDiscountCents,
  getAiPriceTier,
  getPlatformPassPriceCents,
} from "../../lib/ai-subscription-pricing";
import { getMessageAllowance } from "../../lib/ai-usage-allowances";
import { calculateCustomerCheckout } from "../../lib/stripe-checkout-pricing";
import { awardAiSubscriptionPurchasePoints } from "./loyalty-activity-service";
import { markPaidAiPurchaseDuringStreak } from "./loyalty-streak-service";

/** Platform-owned AI specialists — UR Platform LLC keeps 100% of subscription revenue */
export const AI_SUBSCRIPTION_PLATFORM_SHARE_BPS = 10000;

export type AiSubscriptionScope = "platform" | "specialist";

export type AiSubscriptionRecord = {
  id: string;
  userId: string;
  userEmail: string;
  creatorId: string;
  /** Specialist page the pass was purchased from (attribution). */
  homeCreatorId?: string;
  scope: AiSubscriptionScope;
  plan: AiSubscriptionPlan;
  priceCents: number;
  priceTier: ReturnType<typeof getAiPriceTier>;
  startedAt: string;
  expiresAt: string;
  active: boolean;
  autoRenew: boolean;
  source: "stripe" | "simulated" | "loyalty_reward";
  creatorShareCents: number;
  platformShareCents: number;
  messagesIncluded: number;
  messagesUsed: number;
  stripeFeeCents: number;
  totalChargedCents: number;
  billingStateCode: string;
  salesTaxCents: number;
  stateFeeCents: number;
};

const subscriptionStore = new Map<string, AiSubscriptionRecord>();

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function subscriptionKey(userId: string, creatorId: string): string {
  return `${userId}:${creatorId}`;
}

function isPlatformPassRecord(sub: AiSubscriptionRecord): boolean {
  return sub.scope === "platform" || sub.creatorId === PLATFORM_PASS_ID;
}

function isActiveNow(sub: AiSubscriptionRecord, now: number): boolean {
  return sub.active && new Date(sub.expiresAt).getTime() >= now;
}

export function hasActiveAiSubscription(
  userId: string | number | undefined,
  email: string | null | undefined,
  creatorId: string,
  now = Date.now(),
): boolean {
  if (!userId && !email) return false;
  const uid = userId != null ? String(userId) : null;
  const normalized = email ? normalizeEmail(email) : null;

  for (const sub of subscriptionStore.values()) {
    if (!isActiveNow(sub, now)) continue;
    const coversCreator = isPlatformPassRecord(sub) || sub.creatorId === creatorId;
    if (!coversCreator) continue;
    if (uid && sub.userId === uid) return true;
    if (normalized && normalizeEmail(sub.userEmail) === normalized) return true;
  }
  return false;
}

export function getActiveAiSubscription(
  userId: string,
  creatorId: string,
): AiSubscriptionRecord | null {
  const now = Date.now();
  let bestPass: AiSubscriptionRecord | null = null;
  let bestLegacy: AiSubscriptionRecord | null = null;
  for (const sub of subscriptionStore.values()) {
    if (!isActiveNow(sub, now) || sub.userId !== userId) continue;
    if (isPlatformPassRecord(sub)) {
      if (!bestPass || sub.expiresAt > bestPass.expiresAt) bestPass = sub;
      continue;
    }
    if (sub.creatorId === creatorId) {
      if (!bestLegacy || sub.expiresAt > bestLegacy.expiresAt) bestLegacy = sub;
    }
  }
  return bestPass ?? bestLegacy;
}

export function listUserAiSubscriptions(userId: string): AiSubscriptionRecord[] {
  const now = Date.now();
  return Array.from(subscriptionStore.values())
    .filter((s) => s.userId === userId && isActiveNow(s, now))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

function deactivateUserSubscriptions(userId: string, creatorId?: string): void {
  for (const [id, existing] of subscriptionStore) {
    if (existing.userId !== userId) continue;
    if (creatorId && existing.creatorId !== creatorId && !isPlatformPassRecord(existing)) {
      continue;
    }
    subscriptionStore.delete(id);
  }
}

function writeSubscription(record: AiSubscriptionRecord): void {
  subscriptionStore.set(subscriptionKey(record.userId, record.creatorId), record);
}

export function purchaseAiSubscription(params: {
  userId: string;
  userEmail: string;
  creatorId: string;
  plan: AiSubscriptionPlan;
  billingStateCode: string;
  isContentCreator?: boolean;
  source?: AiSubscriptionRecord["source"];
}): AiSubscriptionRecord {
  const email = normalizeEmail(params.userEmail);
  if (!email.includes("@")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Valid email required." });
  }

  let priceCents = getPlatformPassPriceCents(params.plan);
  if (params.isContentCreator) {
    priceCents = applyCreatorDiscountCents(priceCents);
  }

  const messagesIncluded = getMessageAllowance(params.plan, "standard");
  const checkout = calculateCustomerCheckout(priceCents, params.billingStateCode);

  const platformShareCents = Math.round(
    (priceCents * AI_SUBSCRIPTION_PLATFORM_SHARE_BPS) / 10000,
  );
  const creatorShareCents = priceCents - platformShareCents;

  const now = new Date();
  const durationDays = AI_SUBSCRIPTION_PLAN_DAYS[params.plan];
  const expires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  deactivateUserSubscriptions(params.userId);

  const record: AiSubscriptionRecord = {
    id: `aisub-${randomUUID().slice(0, 12)}`,
    userId: params.userId,
    userEmail: email,
    creatorId: PLATFORM_PASS_ID,
    homeCreatorId: params.creatorId,
    scope: "platform",
    plan: params.plan,
    priceCents,
    priceTier: "standard",
    startedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    active: true,
    autoRenew: false,
    source: params.source ?? "simulated",
    creatorShareCents,
    platformShareCents,
    messagesIncluded,
    messagesUsed: 0,
    stripeFeeCents: checkout.stripeFeeCents,
    totalChargedCents: checkout.totalCents,
    billingStateCode: params.billingStateCode,
    salesTaxCents: checkout.salesTaxCents,
    stateFeeCents: checkout.stateFeeCents,
  };

  writeSubscription(record);
  void awardAiSubscriptionPurchasePoints({
    userId: params.userId,
    creatorId: params.creatorId,
    plan: params.plan,
  });
  if (checkout.totalCents > 0) {
    markPaidAiPurchaseDuringStreak(params.userId);
  }
  return record;
}

/** Loyalty reward — free 1-day platform pass after 30-day streak + paid purchase. */
export function grantLoyaltyFreeDaySubscription(params: {
  userId: string;
  userEmail: string;
  creatorId: string;
}): AiSubscriptionRecord {
  const email = normalizeEmail(params.userEmail);
  if (!email.includes("@")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Valid email required." });
  }

  const messagesIncluded = getMessageAllowance("day", "standard");
  const now = new Date();
  const expires = new Date(now.getTime() + AI_SUBSCRIPTION_PLAN_DAYS.day * 24 * 60 * 60 * 1000);

  deactivateUserSubscriptions(params.userId);

  const record: AiSubscriptionRecord = {
    id: `aisub-loyalty-${randomUUID().slice(0, 12)}`,
    userId: params.userId,
    userEmail: email,
    creatorId: PLATFORM_PASS_ID,
    homeCreatorId: params.creatorId,
    scope: "platform",
    plan: "day",
    priceCents: 0,
    priceTier: "standard",
    startedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    active: true,
    autoRenew: false,
    source: "loyalty_reward",
    creatorShareCents: 0,
    platformShareCents: 0,
    messagesIncluded,
    messagesUsed: 0,
    stripeFeeCents: 0,
    totalChargedCents: 0,
    billingStateCode: "FL",
    salesTaxCents: 0,
    stateFeeCents: 0,
  };

  writeSubscription(record);
  return record;
}

export function incrementSubscriptionMessageUsage(
  userId: string,
  creatorId: string,
  units: number,
): void {
  const sub = getActiveAiSubscription(userId, creatorId);
  if (!sub) return;
  sub.messagesUsed += units;
  writeSubscription(sub);
}

export function cancelAiSubscription(userId: string, creatorId: string): boolean {
  const pass = subscriptionStore.get(subscriptionKey(userId, PLATFORM_PASS_ID));
  if (pass) {
    pass.active = false;
    writeSubscription(pass);
    return true;
  }
  const key = subscriptionKey(userId, creatorId);
  const sub = subscriptionStore.get(key);
  if (!sub) return false;
  sub.active = false;
  writeSubscription(sub);
  return true;
}

/** Test helper */
export function _clearAiSubscriptionsForTests(): void {
  subscriptionStore.clear();
}
