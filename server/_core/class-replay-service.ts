/**
 * Pay-per-view replay of ended live classes — AI hosts and human creators.
 * Live ticket holders watch free. Everyone else pays to watch what they missed.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { getStripeIntegration } from "../stripe-integration";
import { ENV } from "./env";
import { recordCreatorTransaction } from "./partner-program-service";
import { recordTransaction } from "./transaction-ledger-service";
import { calculateCustomerCheckout } from "../../lib/stripe-checkout-pricing";
import { normalizeStateCode } from "../../lib/us-state-taxes";
import { sanitizeUserText } from "./input-sanitize";
import { assertSimulatedPurchaseAllowed } from "./payment-channel-guard";
import {
  CLASS_REPLAY_CREATOR_SHARE,
  CLASS_REPLAY_MIN_PRICE_CENTS,
  clampClassReplayPriceCents,
  defaultClassReplayPriceCents,
  isSafeReplayVideoUrl,
} from "../../lib/class-replay-policy";
import { getLiveSession, userHasSessionAccess } from "./ai-live-session-service";
import { listSessionReplayChapters } from "./live-session-room-service";
import {
  getMuxUpload,
  getMuxUploadForSession,
  signMuxPlayback,
  type MuxSignedPlayback,
} from "./mux-video-engine";
import type { MuxAssetStatus } from "../../lib/mux-video-engine";

export type ClassReplay = {
  id: string;
  sessionId: string;
  creatorAiId: string;
  creatorName: string;
  hostUserId?: string;
  title: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  videoUrl?: string;
  muxUploadId?: string;
  muxAssetId?: string;
  muxPlaybackId?: string;
  muxStatus?: MuxAssetStatus;
  published: boolean;
  publishedAt: string;
  publishedByUserId: string;
};

export type ClassReplayChapter = {
  label: string;
  text: string;
};

const replays = new Map<string, ClassReplay>();
const replayBySession = new Map<string, string>();
const replayEntitlements = new Map<string, { replayId: string; userId: string; grantedAt: string }>();
const pendingReplayPayments = new Map<
  string,
  { replayId: string; userId: string; amountCents: number; subtotalCents: number }
>();

function replayKey(replayId: string, userId: string): string {
  return `${replayId}:${userId}`;
}

export function listSessionReplayChaptersSafe(sessionId: string): ClassReplayChapter[] {
  const chapters = listSessionReplayChapters(sessionId);
  if (chapters.length > 0) return chapters;
  return [
    {
      label: "Class recording",
      text: "This replay is the saved live class. Upload the recording to Mux when you publish. Until Mux is ready, buyers get the class archive (questions and session notes).",
    },
  ];
}

export function getReplayBySessionId(sessionId: string): ClassReplay | null {
  const id = replayBySession.get(sessionId);
  if (!id) return null;
  return replays.get(id) ?? null;
}

export function getClassReplay(replayId: string): ClassReplay | null {
  return replays.get(replayId) ?? null;
}

export function listPublishedReplays(opts?: { creatorAiId?: string }): ClassReplay[] {
  return [...replays.values()]
    .filter((r) => r.published)
    .filter((r) => (opts?.creatorAiId ? r.creatorAiId === opts.creatorAiId : true))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export function assertCanPublishReplay(params: {
  sessionId: string;
  userId: string;
  isPlatformOwner: boolean;
}): NonNullable<ReturnType<typeof getLiveSession>> {
  const session = getLiveSession(params.sessionId);
  if (!session) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Class not found." });
  }
  if (session.status !== "ended") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Publish the recording after the live class ends.",
    });
  }
  const isHost = session.hostUserId === params.userId;
  if (!params.isPlatformOwner && !isHost) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the class host or the platform owner can sell this replay.",
    });
  }
  return session;
}

export function publishClassReplay(params: {
  sessionId: string;
  userId: string;
  isPlatformOwner: boolean;
  priceCents: number;
  videoUrl?: string;
  muxUploadId?: string;
}): ClassReplay {
  const session = assertCanPublishReplay(params);
  const videoUrl = sanitizeUserText(params.videoUrl ?? "", 500);
  if (videoUrl && !isSafeReplayVideoUrl(videoUrl)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Video link must be an https URL, or leave it blank to sell the saved class archive.",
    });
  }

  const existing = getReplayBySessionId(session.id);
  const muxUpload = params.muxUploadId ? getMuxUpload(params.muxUploadId) : getMuxUploadForSession(session.id);
  if (params.muxUploadId && !muxUpload) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Mux upload not found." });
  }
  if (muxUpload && muxUpload.sessionId && muxUpload.sessionId !== session.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "That Mux upload belongs to a different class." });
  }
  if (muxUpload && muxUpload.ownerUserId !== params.userId && !params.isPlatformOwner) {
    throw new TRPCError({ code: "FORBIDDEN", message: "That Mux upload does not belong to this class host." });
  }
  const replay: ClassReplay = {
    id: existing?.id ?? randomUUID(),
    sessionId: session.id,
    creatorAiId: session.creatorAiId,
    creatorName: session.creatorName,
    hostUserId: session.hostUserId,
    title: `${session.title} (replay)`,
    description: session.description,
    durationMinutes: session.committedDurationMinutes,
    priceCents: clampClassReplayPriceCents(params.priceCents),
    videoUrl: videoUrl || existing?.videoUrl,
    muxUploadId: muxUpload?.id ?? existing?.muxUploadId,
    muxAssetId: muxUpload?.muxAssetId ?? existing?.muxAssetId,
    muxPlaybackId: muxUpload?.muxPlaybackId ?? existing?.muxPlaybackId,
    muxStatus: muxUpload?.status ?? existing?.muxStatus,
    published: true,
    publishedAt: existing?.publishedAt ?? new Date().toISOString(),
    publishedByUserId: params.userId,
  };
  replays.set(replay.id, replay);
  replayBySession.set(session.id, replay.id);
  return replay;
}

export function assertCanUploadClassVideo(params: {
  sessionId: string;
  userId: string;
  isPlatformOwner: boolean;
}): NonNullable<ReturnType<typeof getLiveSession>> {
  const session = getLiveSession(params.sessionId);
  if (!session) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Class not found." });
  }
  if (session.status !== "ended" && session.status !== "live") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Upload the recording during or after the live class.",
    });
  }
  const isHost = session.hostUserId === params.userId;
  if (!params.isPlatformOwner && !isHost) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the class host or the platform owner can upload this recording.",
    });
  }
  return session;
}

export function attachMuxPlaybackToSession(params: {
  sessionId: string;
  muxUploadId?: string;
  muxAssetId?: string;
  muxPlaybackId: string;
  durationSeconds?: number;
}): ClassReplay | null {
  const replay = getReplayBySessionId(params.sessionId);
  if (!replay) return null;
  replay.muxUploadId = params.muxUploadId ?? replay.muxUploadId;
  replay.muxAssetId = params.muxAssetId ?? replay.muxAssetId;
  replay.muxPlaybackId = params.muxPlaybackId;
  replay.muxStatus = "ready";
  if (params.durationSeconds && params.durationSeconds > 0) {
    replay.durationMinutes = Math.max(replay.durationMinutes, Math.round(params.durationSeconds / 60));
  }
  replays.set(replay.id, replay);
  return replay;
}

export function unpublishClassReplay(params: {
  sessionId: string;
  userId: string;
  isPlatformOwner: boolean;
}): ClassReplay {
  assertCanPublishReplay(params);
  const replay = getReplayBySessionId(params.sessionId);
  if (!replay) {
    throw new TRPCError({ code: "NOT_FOUND", message: "No replay published for this class." });
  }
  replay.published = false;
  replays.set(replay.id, replay);
  return replay;
}

export function userHasReplayAccess(params: {
  replayId: string;
  userId: string;
  isPlatformOwner: boolean;
}): boolean {
  if (params.isPlatformOwner) return true;
  const replay = replays.get(params.replayId);
  if (!replay) return false;
  if (replay.hostUserId === params.userId) return true;
  if (userHasSessionAccess(replay.sessionId, params.userId)) return true;
  return replayEntitlements.has(replayKey(params.replayId, params.userId));
}

export function getReplayWatchAccess(params: {
  replayId: string;
  userId: string;
  isPlatformOwner: boolean;
}) {
  const replay = replays.get(params.replayId);
  if (!replay || !replay.published) {
    throw new TRPCError({ code: "NOT_FOUND", message: "This replay is not available." });
  }
  const allowed = userHasReplayAccess(params);
  if (!allowed) {
    return {
      allowed: false as const,
      replay: publicReplay(replay),
      reason: "Purchase this pay-per-view replay to watch the class you missed.",
    };
  }
  const viaLiveTicket = userHasSessionAccess(replay.sessionId, params.userId);
  return {
    allowed: true as const,
    replay: publicReplay(replay),
    chapters: listSessionReplayChaptersSafe(replay.sessionId),
    videoUrl: replay.videoUrl,
    muxStatus: replay.muxStatus ?? null,
    accessReason: params.isPlatformOwner
      ? "owner"
      : viaLiveTicket
        ? "live_ticket"
        : replay.hostUserId === params.userId
          ? "host"
          : "ppv",
  };
}

export async function getReplayWatchPlayback(params: {
  replayId: string;
  userId: string;
  isPlatformOwner: boolean;
}): Promise<MuxSignedPlayback | null> {
  const access = getReplayWatchAccess(params);
  if (!access.allowed) return null;
  const replay = replays.get(params.replayId);
  if (!replay?.muxPlaybackId || replay.muxStatus !== "ready") return null;
  return signMuxPlayback(replay.muxPlaybackId);
}

export function publicReplay(replay: ClassReplay) {
  return {
    id: replay.id,
    sessionId: replay.sessionId,
    creatorAiId: replay.creatorAiId,
    creatorName: replay.creatorName,
    title: replay.title,
    description: replay.description,
    durationMinutes: replay.durationMinutes,
    priceCents: replay.priceCents,
    priceUsd: (replay.priceCents / 100).toFixed(2),
    hasVideoFile: Boolean(replay.videoUrl || replay.muxPlaybackId),
    videoEngine: replay.muxPlaybackId || replay.muxUploadId ? ("mux" as const) : replay.videoUrl ? ("external_https" as const) : ("archive" as const),
    muxStatus: replay.muxStatus ?? null,
    publishedAt: replay.publishedAt,
  };
}

export async function createReplayCheckout(params: {
  replayId: string;
  userId: string;
  userEmail: string;
  userName: string;
  isPlatformOwner: boolean;
  billingStateCode?: string;
}) {
  const replay = replays.get(params.replayId);
  if (!replay || !replay.published) {
    throw new TRPCError({ code: "NOT_FOUND", message: "This replay is not for sale." });
  }
  if (userHasReplayAccess({ replayId: replay.id, userId: params.userId, isPlatformOwner: params.isPlatformOwner })) {
    return { mode: "already_owned" as const, replayId: replay.id };
  }

  if (params.isPlatformOwner || replay.priceCents === 0) {
    replayEntitlements.set(replayKey(replay.id, params.userId), {
      replayId: replay.id,
      userId: params.userId,
      grantedAt: new Date().toISOString(),
    });
    return { mode: "granted" as const, replayId: replay.id };
  }

  const stateCode = normalizeStateCode(params.billingStateCode);
  if (!stateCode) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select your billing state to calculate taxes and complete checkout.",
    });
  }
  const checkout = calculateCustomerCheckout(replay.priceCents, stateCode);
  const stripe = getStripeIntegration();
  const customer = await stripe.getOrCreateCustomer(
    params.userId,
    params.userEmail,
    params.userName || "UR User",
  );
  const intent = await stripe.createPaymentIntent(customer.id, checkout.totalCents, "USD", {
    userId: params.userId,
    product: "class_replay",
    replayId: replay.id,
    sessionId: replay.sessionId,
  });
  pendingReplayPayments.set(intent.id, {
    replayId: replay.id,
    userId: params.userId,
    amountCents: checkout.totalCents,
    subtotalCents: replay.priceCents,
  });
  return {
    mode: "checkout" as const,
    paymentIntentId: intent.id,
    clientSecret: intent.clientSecret,
    amountCents: checkout.totalCents,
    subtotalCents: replay.priceCents,
    pricing: checkout,
    currency: "USD",
    replayId: replay.id,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "pk_test_mock",
  };
}

export async function confirmReplayPayment(params: {
  paymentIntentId: string;
  userId: string;
  userEmail: string;
}) {
  const pending = pendingReplayPayments.get(params.paymentIntentId);
  if (!pending || pending.userId !== params.userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found." });
  }
  if (!ENV.isProduction) {
    assertSimulatedPurchaseAllowed();
  }

  const replay = replays.get(pending.replayId);
  if (!replay) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Replay not found." });
  }

  replayEntitlements.set(replayKey(replay.id, params.userId), {
    replayId: replay.id,
    userId: params.userId,
    grantedAt: new Date().toISOString(),
  });
  pendingReplayPayments.delete(params.paymentIntentId);

  recordTransaction({
    type: "class_replay_ticket",
    amountCents: pending.subtotalCents,
    description: `Pay-per-view replay — ${replay.title}`,
    payerUserId: params.userId,
    payerEmail: params.userEmail,
    payeeUserId: replay.hostUserId,
    sessionId: replay.sessionId,
    creatorAiId: replay.creatorAiId,
    paymentIntentId: params.paymentIntentId,
    metadata: { replayId: replay.id, creatorShare: CLASS_REPLAY_CREATOR_SHARE },
  });

  if (replay.hostUserId) {
    try {
      recordCreatorTransaction({
        creatorUserId: replay.hostUserId,
        amountCents: pending.subtotalCents,
        payerUserId: params.userId,
        payerEmail: params.userEmail,
        sessionId: replay.sessionId,
        creatorAiId: replay.creatorAiId,
        paymentIntentId: params.paymentIntentId,
      });
    } catch {
      /* AI-hosted class with no enrolled creator */
    }
  }

  return { ok: true as const, replayId: replay.id };
}

export function suggestedReplayPriceCents(sessionId: string): number {
  const session = getLiveSession(sessionId);
  return defaultClassReplayPriceCents(session?.priceCents ?? CLASS_REPLAY_MIN_PRICE_CENTS);
}

export function _resetClassReplaysForTests(): void {
  replays.clear();
  replayBySession.clear();
  replayEntitlements.clear();
  pendingReplayPayments.clear();
}
