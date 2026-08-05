/**
 * AI talk-time pricing — voice & video conversation with specialists.
 *
 * Quick pack: 4 minutes for $1 (+ 1 bonus minute per 4 purchased → 5 min total).
 * Standard pack: 20 minutes billed @ $0.50/min = $10, receive 30 minutes total.
 */

export type AiTalkPackId = "quick_4" | "standard_20";

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
};

/** +1 talk minute for every 4 minutes purchased (general bonus rule) */
export const AI_TALK_BONUS_MINUTES_PER_4 = 1;

/** Standard pack rate */
export const AI_TALK_STANDARD_RATE_CENTS = 50;

export function computeTalkBonusMinutes(billedMinutes: number): number {
  return Math.floor(billedMinutes / 4) * AI_TALK_BONUS_MINUTES_PER_4;
}

/** Standard pack gets 10 bonus minutes (30 total) — better value than the 1:4 rule alone. */
export const AI_TALK_STANDARD_BONUS_MINUTES = 10;

export const AI_TALK_PACKS: Record<AiTalkPackId, AiTalkPack> = {
  quick_4: {
    id: "quick_4",
    label: "Quick Talk",
    billedMinutes: 4,
    bonusMinutes: computeTalkBonusMinutes(4),
    totalMinutes: 4 + computeTalkBonusMinutes(4),
    priceCents: 199,
    rateCentsPerMinute: 40,
    tagline: "5 minutes for $1.99 — includes 1 bonus minute",
  },
  standard_20: {
    id: "standard_20",
    label: "Talk Pack",
    billedMinutes: 20,
    bonusMinutes: AI_TALK_STANDARD_BONUS_MINUTES,
    totalMinutes: 20 + AI_TALK_STANDARD_BONUS_MINUTES,
    priceCents: 20 * AI_TALK_STANDARD_RATE_CENTS,
    rateCentsPerMinute: AI_TALK_STANDARD_RATE_CENTS,
    tagline: "20 min @ 50¢/min — receive 30 minutes of talk time",
    featured: true,
  },
};

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

/** Effective per-minute cost after bonus minutes */
export function effectiveRateCentsPerMinute(pack: AiTalkPack): number {
  return Math.round(pack.priceCents / pack.totalMinutes);
}
