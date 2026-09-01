/**
 * World Director monitor — watches UR World / in-platform talk, red-flags rule breaks to the owner
 * in English, pauses the member, and warns them in their native language.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { sanitizeLanguageLabel, sanitizeUserText } from "./input-sanitize";
import { generateGoogleChatReply, isGoogleCloudAiConfigured } from "./google-ai";
import { recordOwnerCommandEvent, toEnglishForOwner } from "./owner-command-center-service";
import { WORLD_DIRECTOR_AI_ID } from "../../lib/owner-platform-ops-catalog";
import ContentSafetySystem from "../content-safety-system";
import type { ConductChannel } from "./conduct-ledger-service";
import { recordCommunicationForOwner } from "./conduct-ledger-service";
import { TERMS_SUPPORT_EMAIL } from "../../lib/platform-terms-of-use";
import { inferSpokenLanguage, looksNonEnglish } from "./spoken-language";

export { inferSpokenLanguage, looksNonEnglish } from "./spoken-language";

const safety = new ContentSafetySystem();

export type WorldReviewStatus = "paused_review" | "cleared" | "discontinued";

export type WorldLanguageProfile = {
  userId: string;
  nativeLanguage: string;
  lastDetected: string;
  updatedAt: string;
};

export type WorldRedFlag = {
  id: string;
  createdAt: string;
  userId: string;
  userEmail?: string;
  channel: ConductChannel;
  status: WorldReviewStatus;
  nativeLanguage: string;
  /** Exact words the member sent — never replaced by English. */
  originalExcerpt: string;
  /** English copy stored beside the original for owner review. */
  englishExcerpt: string;
  translated: boolean;
  categories: string[];
  ownerNotice: string;
  /** Warning shown to the member (native language). */
  memberWarning: string;
  /** Same warning in English, stored beside the native copy. */
  memberWarningEnglish: string;
  recommendation: string;
  resolvedAt?: string;
  resolvedAction?: "cleared" | "discontinued";
};

const languages = new Map<string, WorldLanguageProfile>();
const holds = new Map<string, WorldRedFlag>();
const flags: WorldRedFlag[] = [];

const MEMBER_WARNING_EN =
  "Your account has been paused for review. World Director AI flagged this conversation for a possible rule violation. " +
  "You will be reactivated or discontinued after the platform owner reviews it. " +
  "Do not use UR World, chat, Talk, or packages until that review is finished. " +
  `Questions: ${TERMS_SUPPORT_EMAIL}.`;

const DISCONTINUE_EN =
  "Your UR account has been discontinued after owner review of a rule violation. Money invested is forfeited. No refunds. " +
  `Questions: ${TERMS_SUPPORT_EMAIL}.`;

export function rememberNativeLanguage(userId: string, text: string): WorldLanguageProfile {
  const detected = inferSpokenLanguage(text);
  const existing = languages.get(userId);
  if (!existing) {
    const row: WorldLanguageProfile = {
      userId,
      nativeLanguage: detected,
      lastDetected: detected,
      updatedAt: new Date().toISOString(),
    };
    languages.set(userId, row);
    return row;
  }
  existing.lastDetected = detected;
  existing.updatedAt = new Date().toISOString();
  if (existing.nativeLanguage === "English" && detected !== "English") {
    existing.nativeLanguage = detected;
  }
  languages.set(userId, existing);
  return existing;
}

export function getNativeLanguage(userId: string): string {
  return languages.get(userId)?.nativeLanguage ?? "English";
}

export async function translateForMember(text: string, language: string): Promise<string> {
  const lang = sanitizeLanguageLabel(language) || "English";
  const source = sanitizeUserText(text, 1200);
  if (!source) return source;
  if (/^english$/i.test(lang)) return source;
  if (!isGoogleCloudAiConfigured()) return source;
  try {
    const { reply } = await generateGoogleChatReply({
      systemPrompt:
        "Translate into the requested language only. Keep the meaning. Do not add advice or extra sentences.",
      history: [],
      message: source,
      responseLanguage: lang,
      maxOutputTokens: 400,
      temperature: 0.1,
    });
    return sanitizeUserText(reply, 1200) || source;
  } catch {
    return source;
  }
}

function extraWorldViolation(text: string): string[] {
  const hits: string[] = [];
  const lower = text.toLowerCase();
  if (/\bhate group\b|\bwhite power\b|\bkill (them|all)\b/.test(lower)) hits.push("hate_speech");
  if (/\b(bully|harass|stalk|doxx)\b/.test(lower)) hits.push("harassment");
  return hits;
}

/** Always keep the original words and an English copy as a pair. */
async function buildBilingualFile(params: {
  original: string;
  englishHint?: string;
}): Promise<{ original: string; english: string; translated: boolean }> {
  const original = sanitizeUserText(params.original, 4000);
  const hint = sanitizeUserText(params.englishHint ?? "", 4000);
  if (!original) {
    return { original: "", english: "(empty)", translated: false };
  }
  if (!looksNonEnglish(original)) {
    return { original, english: hint || original, translated: false };
  }
  const hintIsEnglish = Boolean(hint) && hint !== original && !looksNonEnglish(hint);
  if (hintIsEnglish) {
    return { original, english: hint, translated: true };
  }
  const converted = await toEnglishForOwner(original);
  return {
    original,
    english: converted.english || original,
    translated: converted.translated || converted.english !== original,
  };
}

export function getActiveWorldHold(userId: string): WorldRedFlag | null {
  const row = holds.get(userId);
  if (!row) return null;
  if (row.status === "paused_review" || row.status === "discontinued") return row;
  return null;
}

export function assertNotUnderWorldReview(params: {
  userId: string;
  isPlatformOwner?: boolean;
}): void {
  if (params.isPlatformOwner) return;
  const hold = getActiveWorldHold(params.userId);
  if (!hold) return;
  throw new TRPCError({
    code: "FORBIDDEN",
    message: hold.memberWarning,
  });
}

export function throwIfWorldFlagged(flag: WorldRedFlag | null): void {
  if (!flag) return;
  throw new TRPCError({
    code: "FORBIDDEN",
    message: flag.memberWarning,
  });
}

export function memberWorldHoldForClient(params: {
  userId: string;
  isPlatformOwner?: boolean;
}): { status: WorldReviewStatus; memberWarning: string; nativeLanguage: string } | null {
  if (params.isPlatformOwner) return null;
  const hold = getActiveWorldHold(params.userId);
  if (!hold) return null;
  return {
    status: hold.status,
    memberWarning: hold.memberWarning,
    nativeLanguage: hold.nativeLanguage,
  };
}

export function listWorldRedFlagsForOwner(limit = 50): WorldRedFlag[] {
  return flags.slice(0, Math.min(limit, 100));
}

export function ownerClearWorldReview(userId: string): WorldRedFlag {
  const hold = holds.get(userId);
  if (!hold || (hold.status !== "paused_review" && hold.status !== "discontinued")) {
    throw new TRPCError({ code: "NOT_FOUND", message: "No World Director hold on that member." });
  }
  hold.status = "cleared";
  hold.resolvedAt = new Date().toISOString();
  hold.resolvedAction = "cleared";
  holds.delete(userId);
  return hold;
}

export async function ownerDiscontinueWorldUser(userId: string): Promise<WorldRedFlag> {
  const hold = holds.get(userId);
  if (!hold) {
    throw new TRPCError({ code: "NOT_FOUND", message: "No World Director hold on that member." });
  }
  hold.status = "discontinued";
  hold.resolvedAt = new Date().toISOString();
  hold.resolvedAction = "discontinued";
  hold.memberWarningEnglish = DISCONTINUE_EN;
  hold.memberWarning = DISCONTINUE_EN;
  if (hold.nativeLanguage && hold.nativeLanguage !== "English") {
    hold.memberWarning = await translateForMember(DISCONTINUE_EN, hold.nativeLanguage);
  }
  holds.set(userId, hold);
  return hold;
}

export async function recordAndMonitorCommunication(params: {
  channel: ConductChannel;
  userId: string;
  userEmail?: string;
  peerId?: string;
  original: string;
  isPlatformOwner?: boolean;
}): Promise<{ english: string; flag: WorldRedFlag | null }> {
  const row = await recordCommunicationForOwner({
    channel: params.channel,
    userId: params.userId,
    userEmail: params.userEmail,
    peerId: params.peerId,
    original: params.original,
  });
  const flag = await monitorWorldCommunication({
    userId: params.userId,
    userEmail: params.userEmail,
    channel: params.channel,
    original: row.original,
    english: row.english,
    isPlatformOwner: params.isPlatformOwner,
  });
  return { english: row.english, flag };
}

export async function monitorWorldCommunication(params: {
  userId: string;
  userEmail?: string;
  channel: ConductChannel;
  original: string;
  english: string;
  isPlatformOwner?: boolean;
}): Promise<WorldRedFlag | null> {
  if (params.isPlatformOwner) return null;
  rememberNativeLanguage(params.userId, params.original);
  const native = getNativeLanguage(params.userId);

  const analysis = safety.analyzeContent(params.original, "text");
  const extra = extraWorldViolation(`${params.original} ${params.english}`);
  const categories = [...new Set([...analysis.harmCategories, ...extra])];
  const shouldFlag =
    categories.includes("harassment") ||
    categories.includes("hate_speech") ||
    categories.includes("exploitation") ||
    extra.length > 0;

  if (!shouldFlag) return null;
  if (getActiveWorldHold(params.userId)?.status === "paused_review") {
    return getActiveWorldHold(params.userId);
  }

  const pair = await buildBilingualFile({
    original: params.original,
    englishHint: params.english,
  });
  const recommendation =
    "Review the English copy next to the original. If this was a false alarm, type REACTIVATE WORLD USER " +
    `${params.userId}. If they broke the rules, type DISCONTINUE WORLD USER ${params.userId} ` +
    "(they leave, money forfeited, no refund).";
  const ownerNotice =
    `RED FLAG — World Director paused this member for review.\n` +
    `User: ${params.userEmail ?? params.userId}\n` +
    `Channel: ${params.channel}\n` +
    `Native language: ${native}\n` +
    `Categories: ${categories.join(", ") || "rule violation"}\n` +
    `English copy: ${pair.english}\n` +
    `Original (${native}): ${pair.original}\n` +
    `Recommendation: ${recommendation}`;

  let memberWarning = MEMBER_WARNING_EN;
  if (native !== "English") {
    memberWarning = await translateForMember(MEMBER_WARNING_EN, native);
  }

  const flag: WorldRedFlag = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    userId: params.userId,
    userEmail: params.userEmail,
    channel: params.channel,
    status: "paused_review",
    nativeLanguage: native,
    originalExcerpt: pair.original,
    englishExcerpt: pair.english,
    translated: pair.translated,
    categories,
    ownerNotice,
    memberWarning,
    memberWarningEnglish: MEMBER_WARNING_EN,
    recommendation,
  };
  holds.set(params.userId, flag);
  flags.unshift(flag);
  if (flags.length > 400) flags.length = 400;

  try {
    recordOwnerCommandEvent({
      kind: "protection",
      severity: "high",
      sourceAiId: WORLD_DIRECTOR_AI_ID,
      english: `English copy: ${pair.english}`,
      userId: params.userId,
      translated: pair.translated,
      originalExcerpt: pair.original,
    });
  } catch {
    // Command Center is the backup; the owner review list still has this red flag.
  }

  return flag;
}

export async function tryApplyWorldReviewCommand(message: string): Promise<string | null> {
  const clear = message.match(/^REACTIVATE WORLD USER\s+(\S+)\s*$/i);
  if (clear) {
    const hold = ownerClearWorldReview(clear[1]!);
    return `Reactivated ${hold.userId}. They may use UR again. Keep the English file.`;
  }
  const stop = message.match(/^DISCONTINUE WORLD USER\s+(\S+)\s*$/i);
  if (stop) {
    const hold = await ownerDiscontinueWorldUser(stop[1]!);
    return `Discontinued ${hold.userId}. They stay paused. Money invested is forfeited. No refunds.`;
  }
  return null;
}

export function _resetWorldMonitorForTests(): void {
  languages.clear();
  holds.clear();
  flags.length = 0;
}
