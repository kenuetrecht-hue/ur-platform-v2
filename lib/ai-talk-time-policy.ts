/**
 * Hard-coded AI talk-time policy — $5 / 25 minutes, 30-day expiry, millisecond metering.
 */

import type { AiTalkPackId } from "./ai-talk-pricing";
import { getAiTalkPack } from "./ai-talk-pricing";

/** Unused talk time expires this many days after purchase. */
export const AI_TALK_LOT_EXPIRY_DAYS = 30;

export const AI_TALK_LOT_EXPIRY_MS = AI_TALK_LOT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

export const MS_PER_TALK_MINUTE = 60_000;

export const AI_TALK_EXPIRY_PURCHASE_DISCLOSURE =
  "Talk minutes must be used within 30 days of purchase. Unused minutes expire automatically at the end of that period — no rollover and no refunds for expired time.";

export const AI_TALK_FIVE_DOLLAR_PACK_DISCLOSURE =
  "The $5 mobile-app pack includes exactly 25 minutes of AI speech time. Every second is tracked. Unused minutes expire 30 days after purchase.";

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
    `All unused time expires ${AI_TALK_LOT_EXPIRY_DAYS} days after purchase.`,
  ];
  if (packId === "talk_5") {
    lines.unshift(AI_TALK_FIVE_DOLLAR_PACK_DISCLOSURE);
  }
  return lines;
}
