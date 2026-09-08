/**
 * Millisecond-precise AI talk-time ledger.
 * Small packs expire in 30 days; $120 / $200 expire in 90 days. Unused minutes cannot exceed 1,000.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import type { AiTalkPackId } from "../../lib/ai-talk-pricing";
import {
  AI_TALK_MAX_UNUSED_MINUTES,
  buildTalkLotTrackerView,
  computeLotExpiresAt,
  LOYALTY_TALK_LOT_ID,
  minutesToMilliseconds,
  packTotalMilliseconds,
  type TalkLotSourceId,
  type TalkLotTrackerView,
} from "../../lib/ai-talk-time-policy";

export type TalkTimeLot = {
  id: string;
  userId: string;
  packId: TalkLotSourceId;
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
  packId: TalkLotSourceId;
  priceCents: number;
  purchasedAtMs?: number;
  millisecondsIncluded?: number;
}): TalkTimeLot {
  const purchasedAtMs = params.purchasedAtMs ?? nowMs();
  const millisecondsIncluded =
    params.millisecondsIncluded ??
    (params.packId === LOYALTY_TALK_LOT_ID
      ? minutesToMilliseconds(1)
      : packTotalMilliseconds(params.packId));
  const lot: TalkTimeLot = {
    id: randomUUID(),
    userId: params.userId,
    packId: params.packId,
    purchasedAt: new Date(purchasedAtMs).toISOString(),
    expiresAt: computeLotExpiresAt(purchasedAtMs, params.packId),
    millisecondsIncluded,
    millisecondsUsed: 0,
    priceCents: params.priceCents,
    active: true,
  };
  lots.set(lot.id, lot);
  return lot;
}

export function grantLoyaltyTalkMinutes(params: {
  userId: string;
  minutes: number;
}): TalkTimeLot {
  const minutes = Math.max(1, Math.round(params.minutes));
  return createTalkTimeLot({
    userId: params.userId,
    packId: LOYALTY_TALK_LOT_ID,
    priceCents: 0,
    millisecondsIncluded: minutesToMilliseconds(minutes),
  });
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

export function getTalkMinutesRemaining(userId: string): number {
  return getTalkMillisecondsRemaining(userId) / 60_000;
}

export function assertTalkPurchaseFitsStockpileCap(userId: string, addMinutes: number): void {
  const remaining = getTalkMinutesRemaining(userId);
  const next = remaining + addMinutes;
  if (next > AI_TALK_MAX_UNUSED_MINUTES + 0.01) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        `You already have ${Math.floor(remaining).toLocaleString("en-US")} unused Talk minutes. ` +
        `UR will not sell more until you use some down. Cap is ${AI_TALK_MAX_UNUSED_MINUTES.toLocaleString("en-US")} unused minutes so time cannot be stockpiled.`,
    });
  }
}

export function getTalkTimeStatus(userId: string): {
  millisecondsRemaining: number;
  millisecondsUsed: number;
  millisecondsIncluded: number;
  minutesRemainingDisplay: number;
  earliestExpiryAt: string | null;
  lots: Array<{
    id: string;
    packId: TalkLotSourceId;
    purchasedAt: string;
    expiresAt: string;
    millisecondsRemaining: number;
    millisecondsUsed: number;
    millisecondsIncluded: number;
    tracker: TalkLotTrackerView;
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
    lots: activeLots.map((lot) => {
      const millisecondsRemaining = lotRemainingMs(lot);
      return {
        id: lot.id,
        packId: lot.packId,
        purchasedAt: lot.purchasedAt,
        expiresAt: lot.expiresAt,
        millisecondsRemaining,
        millisecondsUsed: lot.millisecondsUsed,
        millisecondsIncluded: lot.millisecondsIncluded,
        tracker: buildTalkLotTrackerView({
          id: lot.id,
          packId: lot.packId,
          expiresAt: lot.expiresAt,
          millisecondsRemaining,
        }),
      };
    }),
    speechSessionsLogged: speechLog.filter((s) => s.userId === userId).length,
  };
}

export function assertTalkTimeAvailable(userId: string, requiredMs = 1, isPlatformOwner = false): void {
  if (isPlatformOwner) return;
  if (getTalkMillisecondsRemaining(userId) < requiredMs) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Purchase AI talk time to hear this specialist speak. Unused minutes expire 30 days after purchase.",
    });
  }
}

const OWNER_COMPLIMENTARY_LOT_ID = "owner-complimentary";

/** Deduct exact speech duration (milliseconds) from oldest active lot first. Owner is not billed. */
export function consumeTalkTimeMs(params: {
  userId: string;
  creatorId: string;
  durationMs: number;
  source: SpeechUsageRecord["source"];
  startedAtMs?: number;
  isPlatformOwner?: boolean;
}): SpeechUsageRecord {
  const durationMs = Math.max(1, Math.ceil(params.durationMs));
  const startedAtMs = params.startedAtMs ?? nowMs();
  if (params.isPlatformOwner) {
    const record: SpeechUsageRecord = {
      id: randomUUID(),
      userId: params.userId,
      creatorId: params.creatorId,
      lotId: OWNER_COMPLIMENTARY_LOT_ID,
      startedAt: new Date(startedAtMs).toISOString(),
      endedAt: new Date(startedAtMs + durationMs).toISOString(),
      durationMs,
      source: params.source,
    };
    speechLog.push(record);
    return record;
  }
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
