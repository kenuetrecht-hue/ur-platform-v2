/**
 * 3D Workspace subscriptions — day pass and monthly bundles with concurrent AI slots.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  type Workspace3dPlanId,
  getWorkspace3dConcurrentSlots,
  getWorkspace3dPlanPriceCents,
  WORKSPACE_3D_EXTRA_AI_SLOT_CENTS,
  WORKSPACE_3D_PLAN_DAYS,
} from "../../lib/workspace-3d-pricing";
import { calculateCustomerCheckout } from "../../lib/stripe-checkout-pricing";

export type Workspace3dSubscriptionRecord = {
  id: string;
  userId: string;
  userEmail: string;
  plan: Workspace3dPlanId;
  priceCents: number;
  concurrentAiSlots: number;
  extraAiSlots: number;
  startedAt: string;
  expiresAt: string;
  active: boolean;
  source: "stripe" | "simulated";
  stripeFeeCents: number;
  totalChargedCents: number;
  billingStateCode: string;
  salesTaxCents: number;
  stateFeeCents: number;
};

const subscriptionStore = new Map<string, Workspace3dSubscriptionRecord>();

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function subscriptionKey(userId: string): string {
  return userId;
}

export function getMaxConcurrentAiSlots(record: Workspace3dSubscriptionRecord): number {
  return record.concurrentAiSlots + record.extraAiSlots;
}

export function getActiveWorkspace3dSubscription(
  userId: string,
  now = Date.now(),
): Workspace3dSubscriptionRecord | null {
  const sub = subscriptionStore.get(subscriptionKey(userId));
  if (!sub || !sub.active) return null;
  if (new Date(sub.expiresAt).getTime() < now) return null;
  return sub;
}

export function hasActiveWorkspace3dSubscription(userId: string, now = Date.now()): boolean {
  return getActiveWorkspace3dSubscription(userId, now) != null;
}

export type Workspace3dAccessQuote = {
  hasAccess: boolean;
  maxConcurrentAiSlots: number;
  plan: Workspace3dPlanId | null;
  extraAiSlots: number;
  expiresAt: string | null;
};

export function getWorkspace3dAccessQuote(
  userId: string,
  isPlatformOwner: boolean,
): Workspace3dAccessQuote {
  if (isPlatformOwner) {
    return {
      hasAccess: true,
      maxConcurrentAiSlots: 8,
      plan: null,
      extraAiSlots: 0,
      expiresAt: null,
    };
  }

  const sub = getActiveWorkspace3dSubscription(userId);
  if (!sub) {
    return {
      hasAccess: false,
      maxConcurrentAiSlots: 0,
      plan: null,
      extraAiSlots: 0,
      expiresAt: null,
    };
  }

  return {
    hasAccess: true,
    maxConcurrentAiSlots: getMaxConcurrentAiSlots(sub),
    plan: sub.plan,
    extraAiSlots: sub.extraAiSlots,
    expiresAt: sub.expiresAt,
  };
}

export function assertWorkspaceAiSlotLimit(params: {
  userId: string;
  isPlatformOwner: boolean;
  activeAiIds: string[] | undefined;
}): void {
  if (params.isPlatformOwner) return;

  const access = getWorkspace3dAccessQuote(params.userId, false);
  if (!access.hasAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "3D Workspace requires an active plan. Open Workspace Pricing to subscribe.",
    });
  }

  const count = params.activeAiIds?.length ?? 0;
  if (count > access.maxConcurrentAiSlots) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        `Your workspace plan allows ${access.maxConcurrentAiSlots} concurrent AI` +
        `${access.maxConcurrentAiSlots === 1 ? "" : "s"}. Upgrade or remove specialists.`,
    });
  }
}

export function purchaseWorkspace3dPlan(params: {
  userId: string;
  userEmail: string;
  plan: Workspace3dPlanId;
  billingStateCode: string;
  source?: Workspace3dSubscriptionRecord["source"];
}): Workspace3dSubscriptionRecord {
  const email = normalizeEmail(params.userEmail);
  if (!email.includes("@")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Valid email required." });
  }

  const priceCents = getWorkspace3dPlanPriceCents(params.plan);
  const checkout = calculateCustomerCheckout(priceCents, params.billingStateCode);
  const slots = getWorkspace3dConcurrentSlots(params.plan);
  const durationDays = WORKSPACE_3D_PLAN_DAYS[params.plan];

  const now = new Date();
  const expires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const existing = subscriptionStore.get(subscriptionKey(params.userId));
  const preservedExtraSlots = existing?.extraAiSlots ?? 0;

  const record: Workspace3dSubscriptionRecord = {
    id: `ws3d-${randomUUID().slice(0, 12)}`,
    userId: params.userId,
    userEmail: email,
    plan: params.plan,
    priceCents,
    concurrentAiSlots: slots,
    extraAiSlots: preservedExtraSlots,
    startedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    active: true,
    source: params.source ?? "simulated",
    stripeFeeCents: checkout.stripeFeeCents,
    totalChargedCents: checkout.totalCents,
    billingStateCode: params.billingStateCode,
    salesTaxCents: checkout.salesTaxCents,
    stateFeeCents: checkout.stateFeeCents,
  };

  subscriptionStore.set(subscriptionKey(params.userId), record);
  return record;
}

export function purchaseWorkspace3dExtraSlot(params: {
  userId: string;
  userEmail: string;
  billingStateCode: string;
  source?: Workspace3dSubscriptionRecord["source"];
}): Workspace3dSubscriptionRecord {
  const sub = getActiveWorkspace3dSubscription(params.userId);
  if (!sub) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "An active workspace plan is required before adding extra AI slots.",
    });
  }

  const checkout = calculateCustomerCheckout(WORKSPACE_3D_EXTRA_AI_SLOT_CENTS, params.billingStateCode);
  sub.extraAiSlots += 1;
  sub.totalChargedCents += checkout.totalCents;
  subscriptionStore.set(subscriptionKey(params.userId), sub);
  return sub;
}

export function cancelWorkspace3dSubscription(userId: string): boolean {
  const sub = subscriptionStore.get(subscriptionKey(userId));
  if (!sub) return false;
  sub.active = false;
  subscriptionStore.set(subscriptionKey(userId), sub);
  return true;
}

/** Test helper */
export function _clearWorkspace3dSubscriptionsForTests(): void {
  subscriptionStore.clear();
}
