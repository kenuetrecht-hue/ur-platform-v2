/**
 * Beta until launch day.
 * Content creators who join in this window are the first 100 (50% of UR's 15% fee).
 * Basic members who join in this window get 10% off UR's own prices until launch day.
 * The card fee stays on top. A creator's price is not cut.
 */

import { IN_APP_ONLY_SUBTOTAL_CENTS } from "@/lib/payment-channel-policy";
import { getBetaStart, getLaunchDate } from "@/lib/launch-promotion-config";

export const BETA_BASIC_DISCOUNT_PERCENT = 10;

export function isBetaTestingOpen(now = new Date(), launchDate = getLaunchDate()): boolean {
  const t = now.getTime();
  return t >= getBetaStart().getTime() && t < launchDate.getTime();
}

/** Joined on or after beta opened, and before launch day. */
export function enrolledDuringCreatorBeta(enrolledAt: Date, launchDate = getLaunchDate()): boolean {
  const t = enrolledAt.getTime();
  return t >= getBetaStart().getTime() && t < launchDate.getTime();
}

export function qualifiesForBetaBasicDiscount(joinedAt: Date, now = new Date()): boolean {
  return isBetaTestingOpen(now) && enrolledDuringCreatorBeta(joinedAt);
}

/** 10% off a UR-owned price. Never turns another price into the $5.00 app-only amount. */
export function applyBetaBasicDiscountCents(listCents: number): number {
  if (!Number.isInteger(listCents) || listCents <= 0) return listCents;
  const discounted = Math.round((listCents * (100 - BETA_BASIC_DISCOUNT_PERCENT)) / 100);
  let charge = Math.max(1, discounted);
  if (charge === IN_APP_ONLY_SUBTOTAL_CENTS && listCents !== IN_APP_ONLY_SUBTOTAL_CENTS) {
    charge = IN_APP_ONLY_SUBTOTAL_CENTS - 1;
  }
  return charge;
}
