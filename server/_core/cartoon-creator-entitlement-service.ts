/**
 * Prepaid Cartoon Me creator platform lots — hosting + live minutes, 30-day expiry.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  CARTOON_CREATOR_PLAN_DAYS,
  getCartoonCreatorPlan,
  quoteCartoonCreatorPlan,
  type CartoonCreatorPlanId,
  type CartoonCreatorQuote,
} from "../../lib/cartoon-creator-pricing";
import { enrollContentCreator, getContentCreatorProfile } from "./partner-program-service";

export type CartoonCreatorLot = {
  id: string;
  userId: string;
  planId: CartoonCreatorPlanId;
  liveMinutesRemaining: number;
  liveMinutesPurchased: number;
  purchasedAt: string;
  expiresAt: string;
};

const lots = new Map<string, CartoonCreatorLot[]>();

export function _resetCartoonCreatorEntitlementsForTests(): void {
  lots.clear();
}

function nowMs(): number {
  return Date.now();
}

function activeLots(userId: string, at = nowMs()): CartoonCreatorLot[] {
  return (lots.get(userId) ?? []).filter((lot) => new Date(lot.expiresAt).getTime() > at);
}

export function getCartoonCreatorStatus(
  userId: string,
  isPlatformOwner = false,
): {
  complimentary: boolean;
  canHost: boolean;
  canGoLive: boolean;
  liveMinutesRemaining: number;
  expiresAt: string | null;
  lots: CartoonCreatorLot[];
} {
  if (isPlatformOwner) {
    return {
      complimentary: true,
      canHost: true,
      canGoLive: true,
      liveMinutesRemaining: 99_999,
      expiresAt: null,
      lots: [],
    };
  }
  const open = activeLots(userId);
  const liveMinutesRemaining = open.reduce((sum, lot) => sum + lot.liveMinutesRemaining, 0);
  const expiresAt =
    open.length > 0
      ? open.reduce((earliest, lot) => (lot.expiresAt < earliest ? lot.expiresAt : earliest), open[0]!.expiresAt)
      : null;
  return {
    complimentary: false,
    canHost: open.length > 0,
    canGoLive: liveMinutesRemaining > 0,
    liveMinutesRemaining,
    expiresAt,
    lots: open,
  };
}

export function assertCanHostCartoon(params: { userId: string; isPlatformOwner?: boolean }): void {
  const status = getCartoonCreatorStatus(params.userId, Boolean(params.isPlatformOwner));
  if (status.canHost) return;
  throw new TRPCError({
    code: "FORBIDDEN",
    message:
      "Buy a Cartoon Me Creator plan (Channel, Studio, or Network) before you host cartoons or go live as Cartoon Me. Pay first. No refunds.",
  });
}

export function purchaseCartoonCreatorPlan(params: {
  userId: string;
  userEmail: string;
  displayName: string;
  planId: CartoonCreatorPlanId;
  isPlatformOwner?: boolean;
}): { lot: CartoonCreatorLot; quote: CartoonCreatorQuote; status: ReturnType<typeof getCartoonCreatorStatus> } {
  if (!getContentCreatorProfile(params.userId)) {
    enrollContentCreator({
      userId: params.userId,
      userEmail: params.userEmail,
      displayName: params.displayName,
    });
  }
  const quote = quoteCartoonCreatorPlan(params.planId);
  const plan = getCartoonCreatorPlan(params.planId);
  const purchasedAt = new Date();
  const lot: CartoonCreatorLot = {
    id: randomUUID(),
    userId: params.userId,
    planId: params.planId,
    liveMinutesRemaining: plan.liveMinutes,
    liveMinutesPurchased: plan.liveMinutes,
    purchasedAt: purchasedAt.toISOString(),
    expiresAt: new Date(purchasedAt.getTime() + CARTOON_CREATOR_PLAN_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };
  const existing = lots.get(params.userId) ?? [];
  lots.set(params.userId, [lot, ...existing]);
  return {
    lot,
    quote,
    status: getCartoonCreatorStatus(params.userId, Boolean(params.isPlatformOwner)),
  };
}
