/**
 * Concurrent AI slots on the platform text pass.
 * Included: 1 specialist at a time (switch freely). Extra slots are paid add-ons.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  type AiSubscriptionPlan,
  AI_SUBSCRIPTION_PLAN_DAYS,
  INCLUDED_CONCURRENT_AI_SLOTS,
  getConcurrentSlotPriceCents,
} from "../../lib/ai-subscription-pricing";
import { calculateCustomerCheckout } from "../../lib/stripe-checkout-pricing";
import { getActiveAiSubscription } from "./ai-subscription-service";

export const CONCURRENT_SLOT_REQUIRED_MESSAGE =
  "Your text pass includes one AI at a time. Pay for an extra concurrent slot to talk to more than one AI at once (Hive or Town Hall).";

export type ConcurrentSlotLot = {
  id: string;
  plan: AiSubscriptionPlan;
  slots: number;
  priceCents: number;
  startedAt: string;
  expiresAt: string;
};

export type ConcurrentSlotState = {
  extraLots: ConcurrentSlotLot[];
  activeCreatorIds: string[];
};

export type ConcurrentSlotQuote = {
  includedSlots: number;
  extraSlots: number;
  maxSlots: number;
  activeCreatorIds: string[];
  extrasExpireAt: string | null;
};

const slotStore = new Map<string, ConcurrentSlotState>();

function getState(userId: string): ConcurrentSlotState {
  const existing = slotStore.get(userId);
  if (existing) return existing;
  const created: ConcurrentSlotState = { extraLots: [], activeCreatorIds: [] };
  slotStore.set(userId, created);
  return created;
}

function pruneExpiredLots(state: ConcurrentSlotState, now: number): void {
  state.extraLots = state.extraLots.filter((lot) => new Date(lot.expiresAt).getTime() >= now);
}

export function getExtraConcurrentSlots(userId: string, now = Date.now()): number {
  const state = getState(userId);
  pruneExpiredLots(state, now);
  return state.extraLots.reduce((sum, lot) => sum + lot.slots, 0);
}

export function getMaxConcurrentAiSlots(userId: string, now = Date.now()): number {
  return INCLUDED_CONCURRENT_AI_SLOTS + getExtraConcurrentSlots(userId, now);
}

export function getConcurrentSlotQuote(userId: string, now = Date.now()): ConcurrentSlotQuote {
  const state = getState(userId);
  pruneExpiredLots(state, now);
  const extraSlots = state.extraLots.reduce((sum, lot) => sum + lot.slots, 0);
  const extrasExpireAt =
    state.extraLots.length > 0
      ? state.extraLots.reduce(
          (latest, lot) => (lot.expiresAt > latest ? lot.expiresAt : latest),
          state.extraLots[0]!.expiresAt,
        )
      : null;
  return {
    includedSlots: INCLUDED_CONCURRENT_AI_SLOTS,
    extraSlots,
    maxSlots: INCLUDED_CONCURRENT_AI_SLOTS + extraSlots,
    activeCreatorIds: [...state.activeCreatorIds],
    extrasExpireAt,
  };
}

export function assertCanTalkToMultipleAis(userId: string): void {
  if (getMaxConcurrentAiSlots(userId) < 2) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: CONCURRENT_SLOT_REQUIRED_MESSAGE,
    });
  }
}

/**
 * Reserve a specialist slot. With 1 slot, switching replaces the previous AI.
 * Hive / Town Hall must pass requireConcurrent so a second AI is not free.
 */
export function claimAiSpecialistSlot(params: {
  userId: string;
  creatorId: string;
  requireConcurrent?: boolean;
}): { switched: boolean; maxSlots: number } {
  if (params.requireConcurrent) {
    assertCanTalkToMultipleAis(params.userId);
  }

  const state = getState(params.userId);
  pruneExpiredLots(state, Date.now());
  const maxSlots = getMaxConcurrentAiSlots(params.userId);

  if (state.activeCreatorIds.includes(params.creatorId)) {
    return { switched: false, maxSlots };
  }

  if (state.activeCreatorIds.length < maxSlots) {
    state.activeCreatorIds.push(params.creatorId);
    return { switched: false, maxSlots };
  }

  if (maxSlots <= 1) {
    state.activeCreatorIds = [params.creatorId];
    return { switched: true, maxSlots };
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message:
      `You're already talking to ${maxSlots} AIs at once. Close one chat or buy another concurrent slot.`,
  });
}

export function purchaseExtraConcurrentSlot(params: {
  userId: string;
  userEmail: string;
  creatorId: string;
  plan: AiSubscriptionPlan;
  billingStateCode: string;
}): ConcurrentSlotLot {
  const email = params.userEmail.toLowerCase().trim();
  if (!email.includes("@")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Valid email required." });
  }

  const pass = getActiveAiSubscription(params.userId, params.creatorId);
  if (!pass) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Buy a day, week, or month text pass before adding a concurrent AI slot.",
    });
  }

  const priceCents = getConcurrentSlotPriceCents(params.plan);
  calculateCustomerCheckout(priceCents, params.billingStateCode);
  const now = new Date();
  const durationDays = AI_SUBSCRIPTION_PLAN_DAYS[params.plan];
  const expires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const lot: ConcurrentSlotLot = {
    id: `aislot-${randomUUID().slice(0, 12)}`,
    plan: params.plan,
    slots: 1,
    priceCents,
    startedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };

  const state = getState(params.userId);
  pruneExpiredLots(state, now.getTime());
  state.extraLots.push(lot);
  return lot;
}

/** Test helper */
export function _clearPlatformPassSlotsForTests(): void {
  slotStore.clear();
}
