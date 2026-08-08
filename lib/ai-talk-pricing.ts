/**
 * AI talk-time pricing — voice & video conversation with specialists.
 *
 * Pay-as-you-go reference: 25¢ per minute.
 * Pack rule: every $1 purchased = 5 talk minutes.
 * $5 pack = 25 minutes — must checkout in the mobile app (see payment-channel-policy).
 */

import { getRequiredPaymentChannel } from "./payment-channel-policy";

export type AiTalkPackId = "talk_1" | "talk_5";

/** Published per-minute rate when buying à la carte (reference). */
export const AI_TALK_RATE_CENTS_PER_MINUTE = 25;

/** Minutes granted per whole dollar in a talk pack. */
export const AI_TALK_MINUTES_PER_DOLLAR = 5;

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
