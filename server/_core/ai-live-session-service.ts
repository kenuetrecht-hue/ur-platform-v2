/**
 * Paid live video sessions — schedule, Stripe checkout, entitlements, join.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { getStripeIntegration } from "../stripe-integration";
import {
  buildSessionHostSystemPrompt,
  computeSessionTicketCents,
  clampPriceCentsPerMinute,
  clampSessionCapacity,
  assertAllowedSessionDuration,
  getSessionCommitmentSummary,
  getAiSessionProgram,
  CREATOR_MIN_PRICE_CENTS_PER_MINUTE,
  type AllowedSessionDuration,
  type AiSessionProgram,
} from "./ai-session-programming";
import { getCreatorAi } from "./ai-creator-registry";
import { ENV } from "./env";
import { recordCreatorTransaction } from "./partner-program-service";
import { recordTransaction } from "./transaction-ledger-service";

export type LiveSessionStatus = "scheduled" | "live" | "ended" | "cancelled";

export type AiLiveSession = {
  id: string;
  creatorAiId: string;
  creatorName: string;
  title: string;
  description: string;
  startsAt: string;
  /** Promised & billed class length (15, 30, 45, or 60). Host must stay for full duration. */
  committedDurationMinutes: AllowedSessionDuration;
  durationMinutes: AllowedSessionDuration;
  overtimeMinutes: number;
  allowOvertime: boolean;
  priceCentsPerMinute: number;
  priceCents: number;
  maxAttendees: number;
  hostUserId?: string;
  status: LiveSessionStatus;
  roomCode: string;
  attendeeCount: number;
  createdAt: string;
};

export type SessionEntitlement = {
  sessionId: string;
  userId: string;
  userEmail: string;
  paymentIntentId: string;
  grantedAt: string;
};

const sessions = new Map<string, AiLiveSession>();
const entitlements = new Map<string, SessionEntitlement>();
const pendingPayments = new Map<
  string,
  {
    sessionId: string;
    userId: string;
    amountCents: number;
    attributionSlug?: string;
  }
>();

function sessionActualEndsAt(session: AiLiveSession): Date {
  const totalMinutes = session.committedDurationMinutes + session.overtimeMinutes;
  return new Date(Date.parse(session.startsAt) + totalMinutes * 60_000);
}

function sessionCommittedEndsAt(session: AiLiveSession): Date {
  return new Date(Date.parse(session.startsAt) + session.committedDurationMinutes * 60_000);
}

function sessionEndsAt(session: AiLiveSession): Date {
  return sessionActualEndsAt(session);
}

function normalizeStatus(session: AiLiveSession): LiveSessionStatus {
  const now = Date.now();
  const start = Date.parse(session.startsAt);
  const end = sessionEndsAt(session).getTime();
  if (session.status === "cancelled") return "cancelled";
  if (session.status === "ended" || now > end) return "ended";
  if (now >= start && now <= end) return "live";
  return "scheduled";
}

export function scheduleLiveSession(params: {
  creatorAiId: string;
  title?: string;
  description?: string;
  startsAt: string;
  durationMinutes?: number;
  priceCentsPerMinute?: number;
  maxAttendees?: number;
  hostUserId?: string;
}): AiLiveSession {
  const program = getAiSessionProgram(params.creatorAiId);
  if (!program.enabled) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Enable live sessions for this AI in Administration → Program AIs first.",
    });
  }
  const creator = getCreatorAi(params.creatorAiId);
  if (!creator) {
    throw new TRPCError({ code: "NOT_FOUND", message: "AI not found." });
  }
  if (Date.parse(params.startsAt) < Date.now() - 60_000) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Start time must be in the future." });
  }

  const durationMinutes = assertAllowedSessionDuration(
    params.durationMinutes ?? program.durationMinutes,
  );
  const priceCentsPerMinute = clampPriceCentsPerMinute(
    params.priceCentsPerMinute ?? program.priceCentsPerMinute,
  );
  const priceCents = computeSessionTicketCents(durationMinutes, priceCentsPerMinute);
  const maxAttendees = clampSessionCapacity(params.maxAttendees ?? program.maxAttendees);

  const id = randomUUID();
  const session: AiLiveSession = {
    id,
    creatorAiId: params.creatorAiId,
    creatorName: creator.name,
    title: (params.title ?? program.defaultTitle).slice(0, 200),
    description: (params.description ?? program.sessionDescription).slice(0, 2000),
    startsAt: params.startsAt,
    committedDurationMinutes: durationMinutes,
    durationMinutes,
    overtimeMinutes: 0,
    allowOvertime: program.allowOvertime,
    priceCentsPerMinute,
    priceCents,
    maxAttendees,
    status: "scheduled",
    roomCode: randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase(),
    attendeeCount: 0,
    createdAt: new Date().toISOString(),
    hostUserId: params.hostUserId,
  };
  sessions.set(id, session);
  return session;
}

export function listLiveSessions(opts?: {
  creatorAiId?: string;
  upcomingOnly?: boolean;
}): AiLiveSession[] {
  let list = [...sessions.values()].map((s) => ({ ...s, status: normalizeStatus(s) }));
  if (opts?.creatorAiId) list = list.filter((s) => s.creatorAiId === opts.creatorAiId);
  if (opts?.upcomingOnly) {
    list = list.filter((s) => s.status === "scheduled" || s.status === "live");
  }
  return list.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

export function getLiveSession(sessionId: string): AiLiveSession | null {
  const s = sessions.get(sessionId);
  if (!s) return null;
  return { ...s, status: normalizeStatus(s) };
}

export function cancelLiveSession(sessionId: string): AiLiveSession {
  const session = sessions.get(sessionId);
  if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
  const now = Date.now();
  const committedEnd = sessionCommittedEndsAt(session).getTime();
  if (now >= Date.parse(session.startsAt) && now < committedEnd) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot cancel during committed time — host must stay for the full ${session.committedDurationMinutes} minutes.`,
    });
  }
  session.status = "cancelled";
  sessions.set(sessionId, session);
  return session;
}

/** Creator extends a live class past the committed duration (optional overtime). */
export function extendLiveSessionOvertime(params: {
  sessionId: string;
  additionalMinutes: number;
}): AiLiveSession {
  const session = sessions.get(params.sessionId);
  if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
  if (!session.allowOvertime) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Overtime is disabled for this class." });
  }
  const extra = Math.min(120, Math.max(5, Math.round(params.additionalMinutes)));
  session.overtimeMinutes += extra;
  sessions.set(params.sessionId, session);
  return getLiveSession(params.sessionId)!;
}

export function countSessionAttendees(sessionId: string): number {
  let n = 0;
  for (const e of entitlements.values()) {
    if (e.sessionId === sessionId) n += 1;
  }
  return n;
}

export function userHasSessionAccess(sessionId: string, userId: string): boolean {
  for (const e of entitlements.values()) {
    if (e.sessionId === sessionId && e.userId === userId) return true;
  }
  return false;
}

export async function createSessionCheckout(params: {
  sessionId: string;
  userId: string;
  userEmail: string;
  userName: string;
  isPlatformOwner: boolean;
  attributionSlug?: string;
}) {
  const session = getLiveSession(params.sessionId);
  if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
  if (session.status === "cancelled" || session.status === "ended") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This session is no longer available." });
  }
  if (userHasSessionAccess(params.sessionId, params.userId)) {
    return { mode: "already_purchased" as const, sessionId: params.sessionId };
  }
  const sold = countSessionAttendees(params.sessionId);
  if (sold >= session.maxAttendees) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This session is sold out." });
  }

  if (session.priceCentsPerMinute < CREATOR_MIN_PRICE_CENTS_PER_MINUTE) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This class is below the $0.20/min floor and cannot be sold.",
    });
  }

  if (params.isPlatformOwner) {
    grantSessionEntitlement({
      sessionId: params.sessionId,
      userId: params.userId,
      userEmail: params.userEmail,
      paymentIntentId: `owner_${randomUUID()}`,
    });
    recordTransaction({
      type: "owner_comp",
      amountCents: session.priceCents,
      description: `Owner comp — ${session.title}`,
      payerUserId: params.userId,
      payerEmail: params.userEmail,
      payeeUserId: session.hostUserId,
      sessionId: session.id,
      creatorAiId: session.creatorAiId,
      attributionSlug: params.attributionSlug,
    });
    if (session.hostUserId) {
      try {
        recordCreatorTransaction({
          creatorUserId: session.hostUserId,
          amountCents: session.priceCents,
          payerUserId: params.userId,
          payerEmail: params.userEmail,
          sessionId: session.id,
          creatorAiId: session.creatorAiId,
          paymentIntentId: `owner_${randomUUID()}`,
          attributionSlug: params.attributionSlug,
        });
      } catch {
        /* not enrolled */
      }
    }
    return { mode: "granted" as const, sessionId: params.sessionId };
  }

  const stripe = getStripeIntegration();
  const customer = await stripe.getOrCreateCustomer(
    params.userId,
    params.userEmail,
    params.userName || "UR User",
  );
  const intent = await stripe.createPaymentIntent(customer.id, session.priceCents, "USD", {
    userId: params.userId,
    product: "ai_live_session",
    sessionId: params.sessionId,
    creatorAiId: session.creatorAiId,
  });
  pendingPayments.set(intent.id, {
    sessionId: params.sessionId,
    userId: params.userId,
    amountCents: session.priceCents,
    attributionSlug: params.attributionSlug,
  });
  return {
    mode: "checkout" as const,
    paymentIntentId: intent.id,
    clientSecret: intent.clientSecret,
    amountCents: session.priceCents,
    currency: "USD",
    sessionId: params.sessionId,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "pk_test_mock",
  };
}

export async function confirmSessionPayment(params: {
  paymentIntentId: string;
  userId: string;
  userEmail: string;
}) {
  const pending = pendingPayments.get(params.paymentIntentId);
  if (!pending || pending.userId !== params.userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found." });
  }

  const stripe = getStripeIntegration();
  let methodId: string | undefined;
  if (!ENV.isProduction) {
    const customer = await stripe.getOrCreateCustomer(params.userId, params.userEmail, "User");
    methodId = (await stripe.addPaymentMethod(customer.id, "card", "4242", "visa", 12, 2030, true)).id;
  }
  if (!methodId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Payment method required." });
  }
  await stripe.confirmPaymentIntent(params.paymentIntentId, methodId);
  pendingPayments.delete(params.paymentIntentId);

  grantSessionEntitlement({
    sessionId: pending.sessionId,
    userId: params.userId,
    userEmail: params.userEmail,
    paymentIntentId: params.paymentIntentId,
  });

  const session = sessions.get(pending.sessionId);
  if (session?.hostUserId) {
    try {
      recordCreatorTransaction({
        creatorUserId: session.hostUserId,
        amountCents: pending.amountCents,
        payerUserId: params.userId,
        payerEmail: params.userEmail,
        sessionId: pending.sessionId,
        creatorAiId: session.creatorAiId,
        paymentIntentId: params.paymentIntentId,
        attributionSlug: pending.attributionSlug,
      });
    } catch {
      recordTransaction({
        type: "live_class_ticket",
        amountCents: pending.amountCents,
        description: `Live class ticket — ${session.title}`,
        payerUserId: params.userId,
        payerEmail: params.userEmail,
        payeeUserId: session.hostUserId,
        sessionId: pending.sessionId,
        creatorAiId: session.creatorAiId,
        paymentIntentId: params.paymentIntentId,
        attributionSlug: pending.attributionSlug,
      });
    }
  } else if (session) {
    recordTransaction({
      type: "live_class_ticket",
      amountCents: pending.amountCents,
      description: `Live class ticket — ${session.title}`,
      payerUserId: params.userId,
      payerEmail: params.userEmail,
      sessionId: pending.sessionId,
      creatorAiId: session.creatorAiId,
      paymentIntentId: params.paymentIntentId,
      attributionSlug: pending.attributionSlug,
    });
  }

  return { ok: true as const, sessionId: pending.sessionId };
}

function grantSessionEntitlement(params: {
  sessionId: string;
  userId: string;
  userEmail: string;
  paymentIntentId: string;
}) {
  const key = `${params.sessionId}:${params.userId}`;
  entitlements.set(key, {
    sessionId: params.sessionId,
    userId: params.userId,
    userEmail: params.userEmail,
    paymentIntentId: params.paymentIntentId,
    grantedAt: new Date().toISOString(),
  });
  const session = sessions.get(params.sessionId);
  if (session) {
    session.attendeeCount = countSessionAttendees(params.sessionId);
    sessions.set(params.sessionId, session);
  }
}

export function getSessionJoinAccess(params: {
  sessionId: string;
  userId: string;
  isPlatformOwner: boolean;
}) {
  const session = getLiveSession(params.sessionId);
  if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });

  const hasAccess =
    params.isPlatformOwner || userHasSessionAccess(params.sessionId, params.userId);
  const now = Date.now();
  const start = Date.parse(session.startsAt);
  const end = sessionEndsAt(session).getTime();
  const committedEnd = sessionCommittedEndsAt(session).getTime();
  const canEnter = hasAccess && now >= start - 15 * 60_000 && now <= end;
  const hostPrompt = buildSessionHostSystemPrompt(
    session.creatorAiId,
    session.title,
    session.committedDurationMinutes,
  );
  const commitment = getSessionCommitmentSummary({
    startsAt: session.startsAt,
    committedDurationMinutes: session.committedDurationMinutes,
    overtimeMinutes: session.overtimeMinutes,
    allowOvertime: session.allowOvertime,
  });

  return {
    session,
    hasAccess,
    canEnter,
    opensAt: new Date(start - 15 * 60_000).toISOString(),
    endsAt: new Date(end).toISOString(),
    committedEndsAt: commitment.committedEndsAt,
    commitment,
    roomCode: hasAccess ? session.roomCode : null,
    joinPath: hasAccess ? `/live-session/${session.id}` : null,
    hostPrompt: hasAccess ? hostPrompt : null,
    message: !hasAccess
      ? "Purchase a ticket to join this live class."
      : now < start - 15 * 60_000
        ? `Lobby opens 15 minutes before start (${new Date(start).toLocaleString()}).`
        : now > end
          ? "This class has ended."
          : now < committedEnd
            ? `Live now — host committed to the full ${session.committedDurationMinutes} minutes (${commitment.committedMinutesRemaining} min left in commitment).`
            : session.overtimeMinutes > 0
              ? "Bonus overtime — host chose to continue past the committed duration."
              : "You may enter the live room.",
  };
}

export function getOwnerSessionStats() {
  const all = listLiveSessions();
  const revenueCents = all.reduce((sum, s) => sum + s.attendeeCount * s.priceCents, 0);
  return {
    totalSessions: all.length,
    upcoming: all.filter((s) => s.status === "scheduled" || s.status === "live").length,
    totalAttendees: all.reduce((sum, s) => sum + s.attendeeCount, 0),
    estimatedRevenueCents: revenueCents,
  };
}

export function getProgramSummary(program: AiSessionProgram) {
  const ticketCents = computeSessionTicketCents(
    program.durationMinutes,
    program.priceCentsPerMinute,
  );
  return {
    creatorAiId: program.creatorAiId,
    creatorName: program.creatorName,
    enabled: program.enabled,
    durationMinutes: program.durationMinutes,
    priceCentsPerMinute: program.priceCentsPerMinute,
    pricePerMinuteUsd: (program.priceCentsPerMinute / 100).toFixed(2),
    ticketUsd: (ticketCents / 100).toFixed(2),
    maxAttendees: program.maxAttendees,
    minPriceCentsPerMinute: CREATOR_MIN_PRICE_CENTS_PER_MINUTE,
  };
}
