/**
 * Per-AI specialist subscriptions — daily, weekly, and monthly plans.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  type AiSubscriptionPlan,
  AI_SUBSCRIPTION_PLAN_DAYS,
  applyCreatorDiscountCents,
  getPlanPriceCents,
  getAiPriceTier,
} from "../../lib/ai-subscription-pricing";
import { getMessageAllowance } from "../../lib/ai-usage-allowances";
import { calculateCustomerCheckout } from "../../lib/stripe-checkout-pricing";

/** Platform-owned AI specialists — UR LLC keeps 100% of subscription revenue */
export const AI_SUBSCRIPTION_PLATFORM_SHARE_BPS = 10000;

export type AiSubscriptionRecord = {
  id: string;
  userId: string;
  userEmail: string;
  creatorId: string;
  plan: AiSubscriptionPlan;
  priceCents: number;
  priceTier: ReturnType<typeof getAiPriceTier>;
  startedAt: string;
  expiresAt: string;
  active: boolean;
  autoRenew: boolean;
  source: "stripe" | "simulated";
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
    if (!sub.active || sub.creatorId !== creatorId) continue;
    if (new Date(sub.expiresAt).getTime() < now) continue;
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
  let best: AiSubscriptionRecord | null = null;
  for (const sub of subscriptionStore.values()) {
    if (!sub.active || sub.creatorId !== creatorId || sub.userId !== userId) continue;
    if (new Date(sub.expiresAt).getTime() < now) continue;
    if (!best || sub.expiresAt > best.expiresAt) best = sub;
  }
  return best;
}

export function listUserAiSubscriptions(userId: string): AiSubscriptionRecord[] {
  const now = Date.now();
  return Array.from(subscriptionStore.values())
    .filter(
      (s) =>
        s.userId === userId &&
        s.active &&
        new Date(s.expiresAt).getTime() >= now,
    )
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
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

  let priceCents = getPlanPriceCents(params.creatorId, params.plan);
  if (params.isContentCreator) {
    priceCents = applyCreatorDiscountCents(priceCents);
  }

  const tier = getAiPriceTier(params.creatorId);
  const messagesIncluded = getMessageAllowance(params.plan, tier);
  const checkout = calculateCustomerCheckout(priceCents, params.billingStateCode);

  const platformShareCents = Math.round(
    (priceCents * AI_SUBSCRIPTION_PLATFORM_SHARE_BPS) / 10000,
  );
  const creatorShareCents = priceCents - platformShareCents;

  const now = new Date();
  const durationDays = AI_SUBSCRIPTION_PLAN_DAYS[params.plan];
  const expires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const key = subscriptionKey(params.userId, params.creatorId);
  for (const [id, existing] of subscriptionStore) {
    if (existing.userId === params.userId && existing.creatorId === params.creatorId) {
      subscriptionStore.delete(id);
    }
  }

  const record: AiSubscriptionRecord = {
    id: `aisub-${randomUUID().slice(0, 12)}`,
    userId: params.userId,
    userEmail: email,
    creatorId: params.creatorId,
    plan: params.plan,
    priceCents,
    priceTier: tier,
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

  subscriptionStore.set(key, record);
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
  subscriptionStore.set(subscriptionKey(userId, creatorId), sub);
}

export function cancelAiSubscription(userId: string, creatorId: string): boolean {
  const key = subscriptionKey(userId, creatorId);
  const sub = subscriptionStore.get(key);
  if (!sub) return false;
  sub.active = false;
  subscriptionStore.set(key, sub);
  return true;
}

/** Test helper */
export function _clearAiSubscriptionsForTests(): void {
  subscriptionStore.clear();
}
