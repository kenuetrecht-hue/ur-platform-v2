/**
 * Creator-set 1-to-1 video call prices.
 * Fan pays the listed price. Creator keeps 85%. UR keeps 15% (TURN / platform).
 * Exactly $5.00 is reserved for native in-app purchases — skip that slot.
 */

import { IN_APP_ONLY_SUBTOTAL_CENTS } from "./payment-channel-policy";

export const CREATOR_VIDEO_CALL_MIN_CENTS = 100; // $1.00
export const CREATOR_VIDEO_CALL_MAX_CENTS = 500_000; // $5,000.00
export const CREATOR_VIDEO_CALL_BLOCKED_CENTS = IN_APP_ONLY_SUBTOTAL_CENTS; // $5.00

export const CREATOR_VIDEO_CALL_SKU = "creator_video_call";

export const CREATOR_VIDEO_CALL_SPLIT_NOTE =
  "You set the price. Stripe holds the caller’s card, then charges only after you both connect. Time is tracked to the millisecond. You keep 85%. UR keeps 15% so we can run the call network.";

export const CREATOR_VIDEO_CALL_PRICE_HINT =
  "Any amount from $1.00 to $5,000.00 except $5.00 (that amount is reserved for the phone app).";

export function dollarsToCallPriceCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const dollars = Number.parseFloat(cleaned);
  if (!Number.isFinite(dollars)) return null;
  return Math.round(dollars * 100);
}

export function formatCallPriceCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function creatorCallPriceError(cents: number): string | null {
  if (!Number.isInteger(cents) || cents < CREATOR_VIDEO_CALL_MIN_CENTS) {
    return "The lowest 1-to-1 call price is $1.00.";
  }
  if (cents > CREATOR_VIDEO_CALL_MAX_CENTS) {
    return "The highest 1-to-1 call price is $5,000.00.";
  }
  if (cents === CREATOR_VIDEO_CALL_BLOCKED_CENTS) {
    return "Use $4.99 or $5.01 — $5.00 is reserved for the phone app.";
  }
  return null;
}

export function assertCreatorCallPriceCents(cents: number): number {
  const error = creatorCallPriceError(cents);
  if (error) {
    throw new Error(error);
  }
  return cents;
}

export function isAllowedCreatorCallPriceCents(cents: number): boolean {
  return creatorCallPriceError(cents) === null;
}
