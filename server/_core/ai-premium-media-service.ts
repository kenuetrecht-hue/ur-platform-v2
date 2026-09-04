/**
 * Paid voice & video talk entitlements for AI assistants.
 * In-memory MVP — creators pay to speak with ContentMate; users pay for AI video talk.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { recordTransaction } from "./transaction-ledger-service";
import { AFFILIATE_ASSOCIATE_ID } from "./affiliate-associate-ai";
import {
  type AiTalkPackId,
  getAiTalkPack,
  AI_TALK_PACKS,
} from "../../lib/ai-talk-pricing";
import { calculateCustomerCheckout } from "../../lib/stripe-checkout-pricing";
import {
  createTalkTimeLot,
  getTalkMillisecondsRemaining,
  getTalkTimeStatus,
  hasTalkMillisecondsRemaining,
  consumeTalkTimeMs,
  legacyMinutesRemaining,
  secondsToBillingMs,
  getSpeechUsageLog,
} from "./ai-talk-time-tracker";

export type PremiumMediaKind = "creator_voice" | "affiliate_voice" | "ai_video_talk" | "ai_talk";

export type PremiumMediaEntitlement = {
  id: string;
  userId: string;
  kind: PremiumMediaKind;
  creatorId?: string;
  purchasedAt: string;
  expiresAt: string;
  minutesIncluded: number;
  minutesUsed: number;
  /** Service subtotal (before Stripe fee) */
  priceCents: number;
  stripeFeeCents?: number;
  totalChargedCents?: number;
  billingStateCode?: string;
  salesTaxCents?: number;
  stateFeeCents?: number;
  active: boolean;
};

/** Content creators pay to hear ContentMate speak */
export const CREATOR_VOICE_PACK_CENTS = 299;
export const CREATOR_VOICE_MINUTES = 30;

/** Affiliates pay to hear Associate AI speak (text chat remains free) */
export const AFFILIATE_VOICE_PACK_CENTS = 299;
export const AFFILIATE_VOICE_MINUTES = 30;

/** Any user pays for voice/video talk with an AI specialist */
export const AI_VIDEO_TALK_CENTS = AI_TALK_PACKS.talk_5.priceCents;
export const AI_VIDEO_TALK_MINUTES = AI_TALK_PACKS.talk_5.totalMinutes;

const entitlements = new Map<string, PremiumMediaEntitlement>();

function findActiveEntitlement(params: {
  userId: string;
  kind: PremiumMediaKind;
  creatorId?: string;
}): PremiumMediaEntitlement | null {
  const now = Date.now();
  const kinds: PremiumMediaKind[] =
    params.kind === "ai_talk" || params.kind === "ai_video_talk"
      ? ["ai_talk", "ai_video_talk"]
      : [params.kind];

  for (const kind of kinds) {
    for (const e of entitlements.values()) {
      if (!e.active || e.userId !== params.userId || e.kind !== kind) continue;
      if (params.creatorId && e.creatorId && e.creatorId !== params.creatorId) continue;
      if (new Date(e.expiresAt).getTime() < now) continue;
      if (e.minutesUsed >= e.minutesIncluded) continue;
      return e;
    }
  }
  return null;
}

function getTalkMinutesRemaining(userId: string): number {
  return legacyMinutesRemaining(userId);
}

export function hasCreatorVoiceAccess(userId: string, creatorId = "contentmate"): boolean {
  return findActiveEntitlement({ userId, kind: "creator_voice", creatorId }) !== null;
}

export function hasAffiliateVoiceAccess(userId: string): boolean {
  return findActiveEntitlement({
    userId,
    kind: "affiliate_voice",
    creatorId: AFFILIATE_ASSOCIATE_ID,
  }) !== null;
}

export function hasAiVideoTalkAccess(userId: string, isPlatformOwner = false): boolean {
  return isPlatformOwner || hasTalkMillisecondsRemaining(userId);
}

export function hasAiTalkAccess(userId: string, isPlatformOwner = false): boolean {
  return isPlatformOwner || hasTalkMillisecondsRemaining(userId);
}

export function getAiTalkMinutesRemaining(userId: string): number {
  return getTalkMinutesRemaining(userId);
}

export function getAiTalkMillisecondsRemaining(userId: string): number {
  return getTalkMillisecondsRemaining(userId);
}

export function purchaseCreatorVoicePack(params: {
  userId: string;
  userEmail: string;
  creatorId?: string;
}): PremiumMediaEntitlement {
  const creatorId = params.creatorId ?? "contentmate";
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const entitlement: PremiumMediaEntitlement = {
    id: randomUUID(),
    userId: params.userId,
    kind: "creator_voice",
    creatorId,
    purchasedAt: new Date().toISOString(),
    expiresAt,
    minutesIncluded: CREATOR_VOICE_MINUTES,
    minutesUsed: 0,
    priceCents: CREATOR_VOICE_PACK_CENTS,
    active: true,
  };
  entitlements.set(entitlement.id, entitlement);

  recordTransaction({
    type: "other",
    payerUserId: params.userId,
    payerEmail: params.userEmail,
    amountCents: CREATOR_VOICE_PACK_CENTS,
    description: `ContentMate voice pack (${CREATOR_VOICE_MINUTES} min)`,
    status: "completed",
    creatorAiId: creatorId,
    metadata: { entitlementId: entitlement.id, kind: "creator_voice" },
  });

  return entitlement;
}

export function purchaseAffiliateVoicePack(params: {
  userId: string;
  userEmail: string;
}): PremiumMediaEntitlement {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const entitlement: PremiumMediaEntitlement = {
    id: randomUUID(),
    userId: params.userId,
    kind: "affiliate_voice",
    creatorId: AFFILIATE_ASSOCIATE_ID,
    purchasedAt: new Date().toISOString(),
    expiresAt,
    minutesIncluded: AFFILIATE_VOICE_MINUTES,
    minutesUsed: 0,
    priceCents: AFFILIATE_VOICE_PACK_CENTS,
    active: true,
  };
  entitlements.set(entitlement.id, entitlement);

  recordTransaction({
    type: "other",
    payerUserId: params.userId,
    payerEmail: params.userEmail,
    amountCents: AFFILIATE_VOICE_PACK_CENTS,
    description: `Associate AI voice pack (${AFFILIATE_VOICE_MINUTES} min)`,
    status: "completed",
    creatorAiId: AFFILIATE_ASSOCIATE_ID,
    metadata: { entitlementId: entitlement.id, kind: "affiliate_voice" },
  });

  return entitlement;
}

export function purchaseAiTalkPack(params: {
  userId: string;
  userEmail: string;
  packId: AiTalkPackId;
  billingStateCode: string;
  priceCents?: number;
}): PremiumMediaEntitlement & { talkLotId: string; expiresAt: string; millisecondsIncluded: number } {
  const pack = getAiTalkPack(params.packId);
  const priceCents = params.priceCents ?? pack.priceCents;
  const checkout = calculateCustomerCheckout(priceCents, params.billingStateCode);

  const lot = createTalkTimeLot({
    userId: params.userId,
    packId: params.packId,
    priceCents,
  });

  const entitlement: PremiumMediaEntitlement = {
    id: lot.id,
    userId: params.userId,
    kind: "ai_talk",
    purchasedAt: lot.purchasedAt,
    expiresAt: lot.expiresAt,
    minutesIncluded: pack.totalMinutes,
    minutesUsed: 0,
    priceCents,
    stripeFeeCents: checkout.stripeFeeCents,
    totalChargedCents: checkout.totalCents,
    billingStateCode: params.billingStateCode,
    salesTaxCents: checkout.salesTaxCents,
    stateFeeCents: checkout.stateFeeCents,
    active: true,
  };
  entitlements.set(entitlement.id, entitlement);

  recordTransaction({
    type: "other",
    payerUserId: params.userId,
    payerEmail: params.userEmail,
    amountCents: checkout.totalCents,
    description: `AI talk time (${pack.totalMinutes} min — expires in 30 days)`,
    status: "completed",
    metadata: {
      entitlementId: entitlement.id,
      talkLotId: lot.id,
      kind: "ai_talk",
      packId: pack.id,
      millisecondsIncluded: lot.millisecondsIncluded,
      expiresAt: lot.expiresAt,
      subtotalCents: priceCents,
      stripeFeeCents: checkout.stripeFeeCents,
      salesTaxCents: checkout.salesTaxCents,
      stateFeeCents: checkout.stateFeeCents,
      billingStateCode: params.billingStateCode,
    },
  });

  return {
    ...entitlement,
    talkLotId: lot.id,
    millisecondsIncluded: lot.millisecondsIncluded,
  };
}

export function purchaseAiVideoTalkPack(params: {
  userId: string;
  userEmail: string;
  billingStateCode: string;
}): PremiumMediaEntitlement {
  return purchaseAiTalkPack({
    userId: params.userId,
    userEmail: params.userEmail,
    packId: "talk_5",
    billingStateCode: params.billingStateCode,
  });
}

export function consumePremiumMinute(params: {
  userId: string;
  kind: PremiumMediaKind;
  creatorId?: string;
  isPlatformOwner?: boolean;
}): void {
  if (params.isPlatformOwner) return;
  const talkKinds: PremiumMediaKind[] = ["ai_talk", "ai_video_talk"];
  if (talkKinds.includes(params.kind)) {
    consumeTalkTimeMs({
      userId: params.userId,
      creatorId: params.creatorId ?? "unknown",
      durationMs: 60_000,
      source: params.kind === "ai_video_talk" ? "video_session" : "voice_synthesis",
    });
    return;
  }

  const kind = params.kind;
  const e = findActiveEntitlement({ ...params, kind });
  if (!e) {
    const messages: Record<Exclude<PremiumMediaKind, "ai_talk" | "ai_video_talk">, string> = {
      creator_voice: "Purchase a ContentMate voice pack from the Creator Dashboard to hear your assistant speak.",
      affiliate_voice:
        "Purchase an Associate AI voice pack from the Affiliate Dashboard to hear your sales assistant speak.",
    };
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messages[kind as Exclude<PremiumMediaKind, "ai_talk" | "ai_video_talk">],
    });
  }
  e.minutesUsed += 1;
  entitlements.set(e.id, e);
}

export function consumeAiSpeechDuration(params: {
  userId: string;
  creatorId: string;
  durationSeconds: number;
  source?: "voice_synthesis" | "client_playback";
}): ReturnType<typeof consumeTalkTimeMs> {
  return consumeTalkTimeMs({
    userId: params.userId,
    creatorId: params.creatorId,
    durationMs: secondsToBillingMs(params.durationSeconds),
    source: params.source ?? "voice_synthesis",
  });
}

export { getTalkTimeStatus, getSpeechUsageLog };

export function getPremiumMediaStatus(userId: string): {
  creatorVoice: PremiumMediaEntitlement | null;
  affiliateVoice: PremiumMediaEntitlement | null;
  aiVideoTalk: PremiumMediaEntitlement | null;
  aiTalk: PremiumMediaEntitlement | null;
  talkMinutesRemaining: number;
  creatorVoicePriceUsd: string;
  affiliateVoicePriceUsd: string;
  aiVideoTalkPriceUsd: string;
  aiTalkStandardPriceUsd: string;
  aiTalkQuickPriceUsd: string;
} {
  const talkStatus = getTalkTimeStatus(userId);
  const aiTalk = findActiveEntitlement({ userId, kind: "ai_talk" });
  return {
    creatorVoice: findActiveEntitlement({ userId, kind: "creator_voice", creatorId: "contentmate" }),
    affiliateVoice: findActiveEntitlement({
      userId,
      kind: "affiliate_voice",
      creatorId: AFFILIATE_ASSOCIATE_ID,
    }),
    aiVideoTalk:
      findActiveEntitlement({ userId, kind: "ai_video_talk" }) ??
      aiTalk,
    aiTalk,
    talkMinutesRemaining: talkStatus.minutesRemainingDisplay,
    talkMillisecondsRemaining: talkStatus.millisecondsRemaining,
    talkTimeStatus: talkStatus,
    creatorVoicePriceUsd: (CREATOR_VOICE_PACK_CENTS / 100).toFixed(2),
    affiliateVoicePriceUsd: (AFFILIATE_VOICE_PACK_CENTS / 100).toFixed(2),
    aiVideoTalkPriceUsd: (AI_VIDEO_TALK_CENTS / 100).toFixed(2),
    aiTalkStandardPriceUsd: (AI_TALK_PACKS.talk_5.priceCents / 100).toFixed(2),
    aiTalkQuickPriceUsd: (AI_TALK_PACKS.talk_1.priceCents / 100).toFixed(2),
  };
}
