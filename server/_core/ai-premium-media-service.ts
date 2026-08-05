/**
 * Paid voice & video talk entitlements for AI assistants.
 * In-memory MVP — creators pay to speak with ContentMate; users pay for AI video talk.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { recordTransaction } from "./transaction-ledger-service";
import { AFFILIATE_ASSOCIATE_ID } from "./affiliate-associate-ai";

export type PremiumMediaKind = "creator_voice" | "affiliate_voice" | "ai_video_talk";

export type PremiumMediaEntitlement = {
  id: string;
  userId: string;
  kind: PremiumMediaKind;
  creatorId?: string;
  purchasedAt: string;
  expiresAt: string;
  minutesIncluded: number;
  minutesUsed: number;
  priceCents: number;
  active: boolean;
};

/** Content creators pay to hear ContentMate speak */
export const CREATOR_VOICE_PACK_CENTS = 299;
export const CREATOR_VOICE_MINUTES = 30;

/** Affiliates pay to hear Associate AI speak (text chat remains free) */
export const AFFILIATE_VOICE_PACK_CENTS = 299;
export const AFFILIATE_VOICE_MINUTES = 30;

/** Any user pays for video talk with an AI specialist */
export const AI_VIDEO_TALK_CENTS = 499;
export const AI_VIDEO_TALK_MINUTES = 15;

const entitlements = new Map<string, PremiumMediaEntitlement>();

function findActiveEntitlement(params: {
  userId: string;
  kind: PremiumMediaKind;
  creatorId?: string;
}): PremiumMediaEntitlement | null {
  const now = Date.now();
  for (const e of entitlements.values()) {
    if (!e.active || e.userId !== params.userId || e.kind !== params.kind) continue;
    if (params.creatorId && e.creatorId !== params.creatorId) continue;
    if (new Date(e.expiresAt).getTime() < now) continue;
    if (e.minutesUsed >= e.minutesIncluded) continue;
    return e;
  }
  return null;
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

export function hasAiVideoTalkAccess(userId: string): boolean {
  return findActiveEntitlement({ userId, kind: "ai_video_talk" }) !== null;
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

export function purchaseAiVideoTalkPack(params: {
  userId: string;
  userEmail: string;
}): PremiumMediaEntitlement {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const entitlement: PremiumMediaEntitlement = {
    id: randomUUID(),
    userId: params.userId,
    kind: "ai_video_talk",
    purchasedAt: new Date().toISOString(),
    expiresAt,
    minutesIncluded: AI_VIDEO_TALK_MINUTES,
    minutesUsed: 0,
    priceCents: AI_VIDEO_TALK_CENTS,
    active: true,
  };
  entitlements.set(entitlement.id, entitlement);

  recordTransaction({
    type: "other",
    payerUserId: params.userId,
    payerEmail: params.userEmail,
    amountCents: AI_VIDEO_TALK_CENTS,
    description: `AI video talk pack (${AI_VIDEO_TALK_MINUTES} min)`,
    status: "completed",
    metadata: { entitlementId: entitlement.id, kind: "ai_video_talk" },
  });

  return entitlement;
}

export function consumePremiumMinute(params: {
  userId: string;
  kind: PremiumMediaKind;
  creatorId?: string;
}): void {
  const e = findActiveEntitlement(params);
  if (!e) {
    const messages: Record<PremiumMediaKind, string> = {
      creator_voice: "Purchase a ContentMate voice pack from the Creator Dashboard to hear your assistant speak.",
      affiliate_voice:
        "Purchase an Associate AI voice pack from the Affiliate Dashboard to hear your sales assistant speak.",
      ai_video_talk: "Purchase an AI video talk pack to start video chat with this specialist.",
    };
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messages[params.kind],
    });
  }
  e.minutesUsed += 1;
  entitlements.set(e.id, e);
}

export function getPremiumMediaStatus(userId: string): {
  creatorVoice: PremiumMediaEntitlement | null;
  affiliateVoice: PremiumMediaEntitlement | null;
  aiVideoTalk: PremiumMediaEntitlement | null;
  creatorVoicePriceUsd: string;
  affiliateVoicePriceUsd: string;
  aiVideoTalkPriceUsd: string;
} {
  return {
    creatorVoice: findActiveEntitlement({ userId, kind: "creator_voice", creatorId: "contentmate" }),
    affiliateVoice: findActiveEntitlement({
      userId,
      kind: "affiliate_voice",
      creatorId: AFFILIATE_ASSOCIATE_ID,
    }),
    aiVideoTalk: findActiveEntitlement({ userId, kind: "ai_video_talk" }),
    creatorVoicePriceUsd: (CREATOR_VOICE_PACK_CENTS / 100).toFixed(2),
    affiliateVoicePriceUsd: (AFFILIATE_VOICE_PACK_CENTS / 100).toFixed(2),
    aiVideoTalkPriceUsd: (AI_VIDEO_TALK_CENTS / 100).toFixed(2),
  };
}
