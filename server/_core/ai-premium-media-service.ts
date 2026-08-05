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
export const AI_VIDEO_TALK_CENTS = AI_TALK_PACKS.standard_20.priceCents;
export const AI_VIDEO_TALK_MINUTES = AI_TALK_PACKS.standard_20.totalMinutes;

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
  const now = Date.now();
  let total = 0;
  for (const e of entitlements.values()) {
    if (!e.active || e.userId !== userId) continue;
    if (e.kind !== "ai_talk" && e.kind !== "ai_video_talk") continue;
    if (new Date(e.expiresAt).getTime() < now) continue;
    total += Math.max(0, e.minutesIncluded - e.minutesUsed);
  }
  return total;
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
  return getTalkMinutesRemaining(userId) > 0;
}

export function hasAiTalkAccess(userId: string): boolean {
  return getTalkMinutesRemaining(userId) > 0;
}

export function getAiTalkMinutesRemaining(userId: string): number {
  return getTalkMinutesRemaining(userId);
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
}): PremiumMediaEntitlement {
  const pack = getAiTalkPack(params.packId);
  const checkout = calculateCustomerCheckout(pack.priceCents, params.billingStateCode);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const existing = findActiveEntitlement({ userId: params.userId, kind: "ai_talk" });
  if (existing) {
    existing.minutesIncluded += pack.totalMinutes;
    existing.priceCents += pack.priceCents;
    existing.stripeFeeCents = (existing.stripeFeeCents ?? 0) + checkout.stripeFeeCents;
    existing.totalChargedCents = (existing.totalChargedCents ?? 0) + checkout.totalCents;
    existing.salesTaxCents = (existing.salesTaxCents ?? 0) + checkout.salesTaxCents;
    existing.stateFeeCents = (existing.stateFeeCents ?? 0) + checkout.stateFeeCents;
    existing.billingStateCode = params.billingStateCode;
    entitlements.set(existing.id, existing);

    recordTransaction({
      type: "other",
      payerUserId: params.userId,
      payerEmail: params.userEmail,
      amountCents: checkout.totalCents,
      description: `AI talk time top-up (+${pack.totalMinutes} min, ${pack.label})`,
      status: "completed",
      metadata: {
        entitlementId: existing.id,
        kind: "ai_talk",
        packId: pack.id,
        billedMinutes: pack.billedMinutes,
        bonusMinutes: pack.bonusMinutes,
        subtotalCents: pack.priceCents,
        stripeFeeCents: checkout.stripeFeeCents,
        salesTaxCents: checkout.salesTaxCents,
        stateFeeCents: checkout.stateFeeCents,
        billingStateCode: params.billingStateCode,
      },
    });

    return existing;
  }

  const entitlement: PremiumMediaEntitlement = {
    id: randomUUID(),
    userId: params.userId,
    kind: "ai_talk",
    purchasedAt: new Date().toISOString(),
    expiresAt,
    minutesIncluded: pack.totalMinutes,
    minutesUsed: 0,
    priceCents: pack.priceCents,
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
    description: `AI talk time (${pack.totalMinutes} min — ${pack.billedMinutes} billed + ${pack.bonusMinutes} bonus)`,
    status: "completed",
    metadata: {
      entitlementId: entitlement.id,
      kind: "ai_talk",
      packId: pack.id,
      billedMinutes: pack.billedMinutes,
      bonusMinutes: pack.bonusMinutes,
      subtotalCents: pack.priceCents,
      stripeFeeCents: checkout.stripeFeeCents,
      salesTaxCents: checkout.salesTaxCents,
      stateFeeCents: checkout.stateFeeCents,
      billingStateCode: params.billingStateCode,
    },
  });

  return entitlement;
}

export function purchaseAiVideoTalkPack(params: {
  userId: string;
  userEmail: string;
  billingStateCode: string;
}): PremiumMediaEntitlement {
  return purchaseAiTalkPack({
    userId: params.userId,
    userEmail: params.userEmail,
    packId: "standard_20",
    billingStateCode: params.billingStateCode,
  });
}

export function consumePremiumMinute(params: {
  userId: string;
  kind: PremiumMediaKind;
  creatorId?: string;
}): void {
  const talkKinds: PremiumMediaKind[] = ["ai_talk", "ai_video_talk"];
  const kind = talkKinds.includes(params.kind) ? "ai_talk" : params.kind;

  const e = findActiveEntitlement({ ...params, kind });
  if (!e && talkKinds.includes(params.kind)) {
    const legacy = findActiveEntitlement({ userId: params.userId, kind: "ai_video_talk" });
    if (legacy) {
      legacy.minutesUsed += 1;
      entitlements.set(legacy.id, legacy);
      return;
    }
  }
  if (!e) {
    const messages: Record<PremiumMediaKind, string> = {
      creator_voice: "Purchase a ContentMate voice pack from the Creator Dashboard to hear your assistant speak.",
      affiliate_voice:
        "Purchase an Associate AI voice pack from the Affiliate Dashboard to hear your sales assistant speak.",
      ai_video_talk: "Purchase AI talk time to start voice or video chat with this specialist.",
      ai_talk: "Purchase AI talk time to start voice or video chat with this specialist.",
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
  aiTalk: PremiumMediaEntitlement | null;
  talkMinutesRemaining: number;
  creatorVoicePriceUsd: string;
  affiliateVoicePriceUsd: string;
  aiVideoTalkPriceUsd: string;
  aiTalkStandardPriceUsd: string;
  aiTalkQuickPriceUsd: string;
} {
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
    talkMinutesRemaining: getTalkMinutesRemaining(userId),
    creatorVoicePriceUsd: (CREATOR_VOICE_PACK_CENTS / 100).toFixed(2),
    affiliateVoicePriceUsd: (AFFILIATE_VOICE_PACK_CENTS / 100).toFixed(2),
    aiVideoTalkPriceUsd: (AI_VIDEO_TALK_CENTS / 100).toFixed(2),
    aiTalkStandardPriceUsd: (AI_TALK_PACKS.standard_20.priceCents / 100).toFixed(2),
    aiTalkQuickPriceUsd: (AI_TALK_PACKS.quick_4.priceCents / 100).toFixed(2),
  };
}
