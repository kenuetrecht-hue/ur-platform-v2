/**
 * Public 30-day launch promotion — homepage & signup disclosures.
 * Platform fee default: 15%. Discounts apply to that fee (not creator gross).
 */

import { getPlatformPublicOrigin } from "@/lib/platform-urls";

export const PLATFORM_FEE_PERCENT = 15;
export const LAUNCH_SIGNUP_WINDOW_DAYS = 30;
export const LAUNCH_CREATOR_SLOTS = 300;

export type LaunchPromotionTierId = 1 | 2 | 3;

export type LaunchPromotionTier = {
  tier: LaunchPromotionTierId;
  medal: string;
  label: string;
  range: string;
  /** e.g. 50 = half off the 15% platform fee */
  platformFeeDiscountPercent: number;
  durationLabel: string;
  durationDays: number;
  capacity: number;
  extras: string[];
};

function discountedPlatformFeePercent(discountPercent: number): number {
  const fee = PLATFORM_FEE_PERCENT * (1 - discountPercent / 100);
  return Math.round(fee * 10) / 10;
}

export const LAUNCH_PROMOTION_TIERS: LaunchPromotionTier[] = [
  {
    tier: 1,
    medal: "🥇",
    label: "Tier 1 · Founding creators",
    range: "First 100 creators",
    platformFeeDiscountPercent: 50,
    durationLabel: "6 months",
    durationDays: 180,
    capacity: 100,
    extras: [
      `${discountedPlatformFeePercent(50)}% platform fee (normally ${PLATFORM_FEE_PERCENT}%)`,
      "0% platform fee your first 24 hours (Genesis Clock)",
      "2 lifetime drawing entries",
      "1 free weekly ticket for life",
    ],
  },
  {
    tier: 2,
    medal: "🥈",
    label: "Tier 2 · Early adopters",
    range: "Creators 101–200",
    platformFeeDiscountPercent: 60,
    durationLabel: "90 days",
    durationDays: 90,
    capacity: 100,
    extras: [
      `${discountedPlatformFeePercent(60)}% platform fee (normally ${PLATFORM_FEE_PERCENT}%)`,
      "0% platform fee your first 24 hours (Genesis Clock)",
    ],
  },
  {
    tier: 3,
    medal: "🥉",
    label: "Tier 3 · Growing community",
    range: "Creators 201–300",
    platformFeeDiscountPercent: 50,
    durationLabel: "30 days",
    durationDays: 30,
    capacity: 100,
    extras: [
      `${discountedPlatformFeePercent(50)}% platform fee (normally ${PLATFORM_FEE_PERCENT}%)`,
      "0% platform fee your first 24 hours (Genesis Clock)",
    ],
  },
];

export const LAUNCH_PROMOTION_HEADLINE = "30-day creator launch";
export const LAUNCH_PROMOTION_SUBLINE =
  `First ${LAUNCH_CREATOR_SLOTS} creators lock in a discounted platform fee. Standard split: creators keep 85% · UR retains ${PLATFORM_FEE_PERCENT}% unless your tier discount applies.`;

/** Default go-live anchor — override with EXPO_PUBLIC_LAUNCH_DATE or LAUNCH_DATE in .env */
const DEFAULT_LAUNCH_DATE_ISO = "2026-08-12T05:00:00.000Z";

/** Shared launch date for countdown + tier assignment (homepage, app home, server). */
export function getLaunchDate(): Date {
  const raw =
    process.env.EXPO_PUBLIC_LAUNCH_DATE?.trim() ||
    process.env.LAUNCH_DATE?.trim() ||
    DEFAULT_LAUNCH_DATE_ISO;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date(DEFAULT_LAUNCH_DATE_ISO) : parsed;
}

/** Last moment new creators can claim a launch tier (launch + 30 days). */
export function getLaunchWindowEnd(launchDate = getLaunchDate()): Date {
  const end = new Date(launchDate);
  end.setDate(end.getDate() + LAUNCH_SIGNUP_WINDOW_DAYS);
  return end;
}

/** Pull ?ref= from a pasted affiliate URL or return a plain referral code. */
export function parseAffiliateRefFromInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed) || trimmed.includes("?")) {
    try {
      const url = /^https?:\/\//i.test(trimmed)
        ? new URL(trimmed)
        : new URL(`${getPlatformPublicOrigin()}/${trimmed.replace(/^\//, "")}`);
      const ref = url.searchParams.get("ref");
      if (ref?.trim()) return ref.trim().toUpperCase();
      const parts = url.pathname.split("/").filter(Boolean);
      const signupIdx = parts.indexOf("signup");
      if (signupIdx >= 0 && parts[signupIdx + 1]) {
        return parts[signupIdx + 1]!.toUpperCase();
      }
    } catch {
      /* fall through to plain code */
    }
  }

  const code = trimmed.replace(/\s+/g, "").toUpperCase();
  return code.length >= 2 ? code : null;
}

export function buildCreatorSignupHref(ref?: string | null): string {
  const params = new URLSearchParams({ role: "creator" });
  if (ref?.trim()) params.set("ref", ref.trim().toUpperCase());
  return `/signup?${params.toString()}`;
}
