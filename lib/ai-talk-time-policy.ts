/**
 * Hard-coded AI talk-time policy — $5 / 25 minutes, 30-day expiry, millisecond metering.
 */

import type { AiTalkPackId } from "./ai-talk-pricing";
import { getAiTalkPack } from "./ai-talk-pricing";

export const LOYALTY_TALK_LOT_ID = "loyalty_talk" as const;

export type TalkLotSourceId = AiTalkPackId | typeof LOYALTY_TALK_LOT_ID;

/** Unused talk time expires this many days after purchase. */
export const AI_TALK_LOT_EXPIRY_DAYS = 30;

export const AI_TALK_LOT_EXPIRY_MS = AI_TALK_LOT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

export const MS_PER_TALK_MINUTE = 60_000;

/** Warn when remaining talk time is this low so the user can re-up first. */
export const AI_TALK_LOW_BALANCE_MINUTES = 5;
export const AI_TALK_LOW_BALANCE_MS = AI_TALK_LOW_BALANCE_MINUTES * MS_PER_TALK_MINUTE;

export const AI_TALK_LOW_BALANCE_HEADLINE = "Last 5 minutes — re-up before you run out";

export const AI_TALK_LOW_BALANCE_NOTICE =
  "You're down to your last 5 minutes of talk time. Re-up now if you want to keep talking with the AIs — don't wait until it runs out.";

export const AI_TALK_EXPIRY_PURCHASE_DISCLOSURE =
  "Every talk-time purchase must be used within 30 days. If you do not use it in time, you lose what isn't used — no rollover and no refunds.";

export const AI_TALK_EXPIRY_TRACKER_HEADLINE = "Use it within 30 days or you lose what isn't used";

export const AI_TALK_FIVE_DOLLAR_PACK_DISCLOSURE =
  "The $5 mobile-app pack includes exactly 25 minutes of AI speech time. Every second is tracked. Unused minutes expire 30 days after purchase.";

export const AI_TALK_BULK_500_PACK_DISCLOSURE =
  "The $120 web pack includes exactly 500 minutes of AI speech time for two-way voice with the AIs. Every second is tracked. Unused minutes expire 30 days after purchase.";

export const AI_TALK_BULK_1000_PACK_DISCLOSURE =
  "The $200 web pack includes exactly 1,000 minutes of AI speech time for two-way voice with the AIs. Every second is tracked. Unused minutes expire 30 days after purchase.";

export const AI_TALK_METERING_DISCLOSURE =
  "AI speech is billed only while you are connected and audio is playing — tracked to the millisecond. " +
  "If your internet drops, billing stops immediately. When you reconnect, your remaining time resumes exactly where it left off.";

export function minutesToMilliseconds(minutes: number): number {
  return Math.round(minutes * MS_PER_TALK_MINUTE);
}

export function packTotalMilliseconds(packId: AiTalkPackId): number {
  return minutesToMilliseconds(getAiTalkPack(packId).totalMinutes);
}

export function computeLotExpiresAt(purchasedAtMs: number): string {
  return new Date(purchasedAtMs + AI_TALK_LOT_EXPIRY_MS).toISOString();
}

export function isTalkTimeLowBalance(millisecondsRemaining: number): boolean {
  return millisecondsRemaining > 0 && millisecondsRemaining <= AI_TALK_LOW_BALANCE_MS;
}

export function getTalkLowBalanceNotice(millisecondsRemaining: number): string | null {
  if (!isTalkTimeLowBalance(millisecondsRemaining)) return null;
  return `You're down to your last ${formatTalkTimeRemaining(millisecondsRemaining)} of talk time. Re-up now if you want to keep talking with the AIs — don't wait until it runs out.`;
}

export function formatTalkTimeRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = ms % 1000;
  if (minutes >= 1) {
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }
  return `${seconds}.${String(Math.floor(millis / 100)).padStart(1, "0")}s`;
}

export function formatTalkExpiryDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function daysUntilTalkExpiry(iso: string, nowMs = Date.now()): number {
  const remainingMs = new Date(iso).getTime() - nowMs;
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}

export function formatTalkLotLoseBy(iso: string, nowMs = Date.now()): string {
  const when = formatTalkExpiryDate(iso);
  const days = daysUntilTalkExpiry(iso, nowMs);
  if (days <= 0) {
    return `Expired ${when} — unused time from this purchase is lost`;
  }
  if (days === 1) {
    return `Use by ${when} (1 day left) or you lose unused time from this purchase`;
  }
  return `Use by ${when} (${days} days left) or you lose unused time from this purchase`;
}

export type TalkLotTrackerView = {
  id: string;
  packId: TalkLotSourceId;
  packLabel: string;
  millisecondsRemaining: number;
  remainingDisplay: string;
  remainingVerbose: string;
  expiresAt: string;
  expiresAtDisplay: string;
  daysUntilExpiry: number;
  loseByLabel: string;
};

export function buildTalkLotTrackerView(params: {
  id: string;
  packId: TalkLotSourceId;
  expiresAt: string;
  millisecondsRemaining: number;
}, nowMs = Date.now()): TalkLotTrackerView {
  const packLabel =
    params.packId === LOYALTY_TALK_LOT_ID
      ? "Loyalty talk"
      : getAiTalkPack(params.packId).label;
  return {
    id: params.id,
    packId: params.packId,
    packLabel,
    millisecondsRemaining: params.millisecondsRemaining,
    remainingDisplay: formatTalkTimeRemaining(params.millisecondsRemaining),
    remainingVerbose: formatTalkTimeRemainingVerbose(params.millisecondsRemaining),
    expiresAt: params.expiresAt,
    expiresAtDisplay: formatTalkExpiryDate(params.expiresAt),
    daysUntilExpiry: daysUntilTalkExpiry(params.expiresAt, nowMs),
    loseByLabel: formatTalkLotLoseBy(params.expiresAt, nowMs),
  };
}

export function formatTalkTimeRemainingVerbose(ms: number): string {
  if (ms <= 0) return "0 minutes remaining";
  const minutes = Math.floor(ms / MS_PER_TALK_MINUTE);
  const seconds = Math.floor((ms % MS_PER_TALK_MINUTE) / 1000);
  const millis = ms % 1000;
  if (minutes > 0) {
    return `${minutes} min ${seconds} sec remaining (${ms.toLocaleString()} ms)`;
  }
  return `${seconds}.${String(millis).padStart(3, "0")}s remaining`;
}

export function getTalkPackPurchaseDisclosures(packId: AiTalkPackId): string[] {
  const pack = getAiTalkPack(packId);
  const lines = [
    AI_TALK_EXPIRY_PURCHASE_DISCLOSURE,
    AI_TALK_METERING_DISCLOSURE,
    `This pack includes ${pack.totalMinutes} minutes (${minutesToMilliseconds(pack.totalMinutes).toLocaleString()} ms) of AI speech.`,
    `All unused time expires ${AI_TALK_LOT_EXPIRY_DAYS} days after purchase — anything left is lost.`,
  ];
  if (packId === "talk_5") {
    lines.unshift(AI_TALK_FIVE_DOLLAR_PACK_DISCLOSURE);
  }
  if (packId === "talk_120") {
    lines.unshift(AI_TALK_BULK_500_PACK_DISCLOSURE);
  }
  if (packId === "talk_200") {
    lines.unshift(AI_TALK_BULK_1000_PACK_DISCLOSURE);
  }
  return lines;
}
