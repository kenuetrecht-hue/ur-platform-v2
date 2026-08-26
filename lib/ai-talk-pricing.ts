/**
 * AI talk-time pricing — voice & video conversation with specialists.
 *
 * Pay-as-you-go reference: 25¢ per minute.
 * Pack rule: every $1 purchased = 5 talk minutes.
 * $5 pack = 25 minutes — must checkout in the mobile app (see payment-channel-policy).
 * $120 pack = 500 minutes — bulk two-way voice, web checkout.
 * $200 pack = 1,000 minutes — heavy two-way voice, web checkout.
 */

import { getRequiredPaymentChannel } from "./payment-channel-policy";

export const AI_TALK_PACK_IDS = ["talk_1", "talk_5", "talk_120", "talk_200"] as const;

export type AiTalkPackId = (typeof AI_TALK_PACK_IDS)[number];

/** Published per-minute rate when buying à la carte (reference). */
export const AI_TALK_RATE_CENTS_PER_MINUTE = 25;

/** Minutes granted per whole dollar in a talk pack. */
export const AI_TALK_MINUTES_PER_DOLLAR = 5;

/** Bulk pack — $120 for 500 talk minutes. */
export const AI_TALK_BULK_500_PRICE_CENTS = 12_000;
export const AI_TALK_BULK_500_MINUTES = 500;

/** Heavy pack — $200 for 1,000 talk minutes. */
export const AI_TALK_BULK_1000_PRICE_CENTS = 20_000;
export const AI_TALK_BULK_1000_MINUTES = 1000;

export type AiTalkPack = {
  id: AiTalkPackId;
  label: string;
  billedMinutes: number;
  bonusMinutes: number;
  totalMinutes: number;
  priceCents: number;
  rateCentsPerMinute: number;
  tagline: string;
  featured?: boolean;
  requiredPaymentChannel: ReturnType<typeof getRequiredPaymentChannel>;
};

export function computeTalkMinutesForDollars(dollars: number): number {
  return dollars * AI_TALK_MINUTES_PER_DOLLAR;
}

export const AI_TALK_PACKS: Record<AiTalkPackId, AiTalkPack> = {
  talk_1: {
    id: "talk_1",
    label: "$1 Talk",
    billedMinutes: computeTalkMinutesForDollars(1),
    bonusMinutes: 0,
    totalMinutes: computeTalkMinutesForDollars(1),
    priceCents: 100,
    rateCentsPerMinute: AI_TALK_RATE_CENTS_PER_MINUTE,
    tagline: "5 minutes for $1 — web browser checkout",
    requiredPaymentChannel: getRequiredPaymentChannel(100),
  },
  talk_5: {
    id: "talk_5",
    label: "$5 Talk",
    billedMinutes: computeTalkMinutesForDollars(5),
    bonusMinutes: 0,
    totalMinutes: computeTalkMinutesForDollars(5),
    priceCents: 500,
    rateCentsPerMinute: AI_TALK_RATE_CENTS_PER_MINUTE,
    tagline: "25 minutes for $5 — mobile app in-app purchase",
    featured: true,
    requiredPaymentChannel: getRequiredPaymentChannel(500),
  },
  talk_120: {
    id: "talk_120",
    label: "$120 Talk",
    billedMinutes: AI_TALK_BULK_500_MINUTES,
    bonusMinutes: 0,
    totalMinutes: AI_TALK_BULK_500_MINUTES,
    priceCents: AI_TALK_BULK_500_PRICE_CENTS,
    rateCentsPerMinute: AI_TALK_RATE_CENTS_PER_MINUTE,
    tagline: "500 minutes for $120 — bulk two-way voice, web checkout",
    featured: true,
    requiredPaymentChannel: getRequiredPaymentChannel(AI_TALK_BULK_500_PRICE_CENTS),
  },
  talk_200: {
    id: "talk_200",
    label: "$200 Talk",
    billedMinutes: AI_TALK_BULK_1000_MINUTES,
    bonusMinutes: 0,
    totalMinutes: AI_TALK_BULK_1000_MINUTES,
    priceCents: AI_TALK_BULK_1000_PRICE_CENTS,
    rateCentsPerMinute: AI_TALK_RATE_CENTS_PER_MINUTE,
    tagline: "1,000 minutes for $200 — heavy hitters, web checkout",
    featured: true,
    requiredPaymentChannel: getRequiredPaymentChannel(AI_TALK_BULK_1000_PRICE_CENTS),
  },
};

/** @deprecated Use talk_1 */
export const LEGACY_QUICK_PACK_ID = "talk_1" as const;

/** @deprecated Use talk_5 */
export const LEGACY_STANDARD_PACK_ID = "talk_5" as const;

export function getAiTalkPack(packId: AiTalkPackId): AiTalkPack {
  return AI_TALK_PACKS[packId];
}

export function listAiTalkPacks(): AiTalkPack[] {
  return Object.values(AI_TALK_PACKS);
}

export function formatTalkPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatTalkMinutes(minutes: number): string {
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

export function effectiveRateCentsPerMinute(pack: AiTalkPack): number {
  return Math.round(pack.priceCents / pack.totalMinutes);
}

export function isTalkPackAllowedOnPlatform(
  packId: AiTalkPackId,
  clientPlatform: "web" | "native",
): boolean {
  const pack = getAiTalkPack(packId);
  const channel = clientPlatform === "web" ? "web_browser" : "in_app";
  return pack.requiredPaymentChannel === channel;
}

export function listTalkPacksForPlatform(clientPlatform: "web" | "native"): AiTalkPack[] {
  return listAiTalkPacks().filter((pack) =>
    isTalkPackAllowedOnPlatform(pack.id, clientPlatform),
  );
}
