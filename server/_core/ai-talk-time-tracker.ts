/**
 * Millisecond-precise AI talk-time ledger.
 * Each purchase creates a lot that expires 30 days after purchase (hard-coded).
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import type { AiTalkPackId } from "../../lib/ai-talk-pricing";
import { getAiTalkPack } from "../../lib/ai-talk-pricing";
import {
  AI_TALK_LOT_EXPIRY_MS,
  computeLotExpiresAt,
  minutesToMilliseconds,
  packTotalMilliseconds,
} from "../../lib/ai-talk-time-policy";

export type TalkTimeLot = {
  id: string;
  userId: string;
  packId: AiTalkPackId;
  purchasedAt: string;
  expiresAt: string;
  millisecondsIncluded: number;
  millisecondsUsed: number;
  priceCents: number;
  active: boolean;
};

export type SpeechUsageRecord = {
  id: string;
  userId: string;
  creatorId: string;
  lotId: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  source: "voice_synthesis" | "video_session" | "client_playback";
};

const lots = new Map<string, TalkTimeLot>();
const speechLog: SpeechUsageRecord[] = [];

function nowMs(): number {
  return Date.now();
}

function lotRemainingMs(lot: TalkTimeLot, at = nowMs()): number {
  if (!lot.active) return 0;
  if (new Date(lot.expiresAt).getTime() <= at) return 0;
  return Math.max(0, lot.millisecondsIncluded - lot.millisecondsUsed);
}

function purgeExpiredLots(userId?: string): void {
  const at = nowMs();
  for (const lot of lots.values()) {
    if (userId && lot.userId !== userId) continue;
    if (new Date(lot.expiresAt).getTime() <= at && lot.active) {
      lot.active = false;
      lots.set(lot.id, lot);
    }
  }
}

export function createTalkTimeLot(params: {
  userId: string;
  packId: AiTalkPackId;
  priceCents: number;
  purchasedAtMs?: number;
}): TalkTimeLot {
  const purchasedAtMs = params.purchasedAtMs ?? nowMs();
  const lot: TalkTimeLot = {
    id: randomUUID(),
    userId: params.userId,
    packId: params.packId,
    purchasedAt: new Date(purchasedAtMs).toISOString(),
    expiresAt: computeLotExpiresAt(purchasedAtMs),
    millisecondsIncluded: packTotalMilliseconds(params.packId),
    millisecondsUsed: 0,
    priceCents: params.priceCents,
    active: true,
  };
  lots.set(lot.id, lot);
  return lot;
}

export function getActiveTalkLots(userId: string): TalkTimeLot[] {
  purgeExpiredLots(userId);
  return Array.from(lots.values())
    .filter((lot) => lot.userId === userId && lot.active && lotRemainingMs(lot) > 0)
    .sort((a, b) => a.purchasedAt.localeCompare(b.purchasedAt));
}

export function getTalkMillisecondsRemaining(userId: string): number {
  return getActiveTalkLots(userId).reduce((sum, lot) => sum + lotRemainingMs(lot), 0);
}

export function hasTalkMillisecondsRemaining(userId: string): boolean {
  return getTalkMillisecondsRemaining(userId) > 0;
}

export function getTalkTimeStatus(userId: string): {
  millisecondsRemaining: number;
  millisecondsUsed: number;
  millisecondsIncluded: number;
  minutesRemainingDisplay: number;
  earliestExpiryAt: string | null;
  lots: Array<{
    id: string;
    packId: AiTalkPackId;
    purchasedAt: string;
    expiresAt: string;
    millisecondsRemaining: number;
    millisecondsUsed: number;
    millisecondsIncluded: number;
  }>;
  speechSessionsLogged: number;
} {
  purgeExpiredLots(userId);
  const activeLots = getActiveTalkLots(userId);
  const allUserLots = Array.from(lots.values()).filter((l) => l.userId === userId && l.active);

  const millisecondsRemaining = activeLots.reduce((sum, lot) => sum + lotRemainingMs(lot), 0);
  const millisecondsUsed = allUserLots.reduce((sum, lot) => sum + lot.millisecondsUsed, 0);
  const millisecondsIncluded = allUserLots.reduce((sum, lot) => sum + lot.millisecondsIncluded, 0);

  const earliestExpiryAt =
    activeLots.length > 0
      ? activeLots.reduce(
          (earliest, lot) => (lot.expiresAt < earliest ? lot.expiresAt : earliest),
          activeLots[0]!.expiresAt,
        )
      : null;

  return {
    millisecondsRemaining,
    millisecondsUsed,
    millisecondsIncluded,
    minutesRemainingDisplay: Math.floor(millisecondsRemaining / 60_000),
    earliestExpiryAt,
    lots: activeLots.map((lot) => ({
      id: lot.id,
      packId: lot.packId,
      purchasedAt: lot.purchasedAt,
      expiresAt: lot.expiresAt,
      millisecondsRemaining: lotRemainingMs(lot),
      millisecondsUsed: lot.millisecondsUsed,
      millisecondsIncluded: lot.millisecondsIncluded,
    })),
    speechSessionsLogged: speechLog.filter((s) => s.userId === userId).length,
  };
}

export function assertTalkTimeAvailable(userId: string, requiredMs = 1): void {
  if (getTalkMillisecondsRemaining(userId) < requiredMs) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Purchase AI talk time to hear this specialist speak. Unused minutes expire 30 days after purchase.",
    });
  }
}

/** Deduct exact speech duration (milliseconds) from oldest active lot first. */
export function consumeTalkTimeMs(params: {
  userId: string;
  creatorId: string;
  durationMs: number;
  source: SpeechUsageRecord["source"];
  startedAtMs?: number;
}): SpeechUsageRecord {
  const durationMs = Math.max(1, Math.ceil(params.durationMs));
  purgeExpiredLots(params.userId);

  const activeLots = getActiveTalkLots(params.userId);
  const totalRemaining = activeLots.reduce((sum, lot) => sum + lotRemainingMs(lot), 0);
  if (totalRemaining < durationMs) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Insufficient talk time. Purchase a new pack — unused minutes expire after 30 days.",
    });
  }

  let remainingToDeduct = durationMs;
  let primaryLotId = activeLots[0]!.id;
  const startedAtMs = params.startedAtMs ?? nowMs();

  for (const lot of activeLots) {
    if (remainingToDeduct <= 0) break;
    const available = lotRemainingMs(lot);
    if (available <= 0) continue;
    const deduct = Math.min(available, remainingToDeduct);
    lot.millisecondsUsed += deduct;
    remainingToDeduct -= deduct;
    primaryLotId = lot.id;
    lots.set(lot.id, lot);
  }

  const endedAtMs = startedAtMs + durationMs;
  const record: SpeechUsageRecord = {
    id: randomUUID(),
    userId: params.userId,
    creatorId: params.creatorId,
    lotId: primaryLotId,
    startedAt: new Date(startedAtMs).toISOString(),
    endedAt: new Date(endedAtMs).toISOString(),
    durationMs,
    source: params.source,
  };
  speechLog.push(record);
  return record;
}

export function getSpeechUsageLog(userId: string, limit = 50): SpeechUsageRecord[] {
  return speechLog
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, limit);
}

/** Test helper */
export function _clearTalkTimeForTests(): void {
  lots.clear();
  speechLog.length = 0;
}

/** Test helper — simulate expiry */
export function _expireTalkLotsForTests(userId: string): void {
  for (const lot of lots.values()) {
    if (lot.userId !== userId) continue;
    lot.expiresAt = new Date(nowMs() - 1000).toISOString();
    lot.active = false;
    lots.set(lot.id, lot);
  }
}

export function secondsToBillingMs(seconds: number): number {
  return Math.max(1, Math.ceil(seconds * 1000));
}

export function legacyMinutesRemaining(userId: string): number {
  return Math.floor(getTalkMillisecondsRemaining(userId) / 60_000);
}

export function addTalkMinutesFromLegacyPurchase(
  userId: string,
  packId: AiTalkPackId,
  priceCents: number,
): TalkTimeLot {
  return createTalkTimeLot({ userId, packId, priceCents });
}

export { minutesToMilliseconds, packTotalMilliseconds };
