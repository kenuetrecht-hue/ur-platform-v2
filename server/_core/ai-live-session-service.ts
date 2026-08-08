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
import {
  computeTierTicketCents,
  GROUP_APPOINTMENT_MIN_ATTENDEES,
  GROUP_APPOINTMENT_MIN_PRICE_CENTS_PER_MINUTE,
  isGroupAppointmentTier,
  resolveLiveClassPricing,
  STANDARD_MIN_PRICE_CENTS_PER_MINUTE,
  type LiveClassPricingTier,
} from "../../lib/live-class-pricing-policy";
import {
  assertEnrollmentOpen,
  assertBackoutOpen,
  assertScheduleLeadTime,
  getEnrollmentDeadlineIso,
  getBackoutDeadlineIso,
  getFillWindowStartIso,
  isBackoutOpen,
  isEnrollmentOpen,
  isInFillWindow,
  LIVE_CLASS_ENROLLMENT_CUTOFF_MS,
  qualifiesForPatienceRun,
  isPatienceGracePending,
} from "../../lib/live-class-scheduling-policy";
import { calculateCustomerCheckout } from "../../lib/stripe-checkout-pricing";
import { normalizeStateCode } from "../../lib/us-state-taxes";

export type LiveSessionStatus = "scheduled" | "live" | "ended" | "cancelled";

/** Whether enough people registered for the class to run at start time. */
export type ClassEnrollmentStatus = "gathering" | "confirmed" | "cancelled_insufficient";

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
  pricingTier: LiveClassPricingTier;
  /** When true, all ticket holders are refunded if minimum is not met at start time. */
  refundsOnUnderfill: boolean;
  /** When true, only paid tickets (not free RSVPs) count toward minimum. */
  ticketOnlyMinimum: boolean;
  refundsProcessed: boolean;
  /** Highest paid ticket count reached — used for patience grace when 25th seat opens. */
  peakPaidCount: number;
  maxAttendees: number;
  /** Class runs only when registeredCount >= minAttendeesToStart at start time. */
  minAttendeesToStart: number;
  enrollmentStatus: ClassEnrollmentStatus;
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
  amountCents: number;
  grantedAt: string;
  refundedAt?: string;
};

const sessions = new Map<string, AiLiveSession>();
const entitlements = new Map<string, SessionEntitlement>();
/** Free interest RSVPs — counts toward minimum without a ticket (e.g. "save my spot"). */
const interestRsvps = new Map<string, Set<string>>();
const pendingPayments = new Map<
  string,
  {
    sessionId: string;
    userId: string;
    amountCents: number;
    subtotalCents: number;
    billingStateCode?: string;
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

function countInterestRsvps(sessionId: string): number {
  return interestRsvps.get(sessionId)?.size ?? 0;
}

export function getRegisteredCount(sessionId: string, session?: AiLiveSession): number {
  const ticketCount = countSessionAttendees(sessionId);
  if (session?.ticketOnlyMinimum) {
    return ticketCount;
  }
  return ticketCount + countInterestRsvps(sessionId);
}

export function getPaidTicketCount(sessionId: string): number {
  return countSessionAttendees(sessionId);
}

function syncPeakPaidCount(session: AiLiveSession): void {
  const paid = countSessionAttendees(session.id);
  if (paid > session.peakPaidCount) {
    session.peakPaidCount = paid;
  }
}

export function getSessionEnrollmentSummary(session: AiLiveSession): {
  minAttendeesToStart: number;
  registeredCount: number;
  ticketCount: number;
  interestCount: number;
  spotsNeeded: number;
  confirmedToRun: boolean;
  enrollmentStatus: ClassEnrollmentStatus;
  enrollmentLabel: string;
  enrollmentDeadlineAt: string;
  enrollmentOpen: boolean;
  minimumCheckAt: string;
  backoutDeadlineAt: string;
  backoutOpen: boolean;
  inFillWindow: boolean;
  fillWindowStartAt: string;
  peakPaidCount: number;
  patienceGracePending: boolean;
  patienceGraceActive: boolean;
} {
  syncPeakPaidCount(session);
  const ticketCount = countSessionAttendees(session.id);
  const interestCount = countInterestRsvps(session.id);
  const registeredCount = session.ticketOnlyMinimum ? ticketCount : ticketCount + interestCount;
  const spotsNeeded = Math.max(0, session.minAttendeesToStart - registeredCount);
  const confirmedToRun =
    session.enrollmentStatus === "confirmed" ||
    (session.enrollmentStatus === "gathering" && registeredCount >= session.minAttendeesToStart);

  const enrollmentDeadlineAt = getEnrollmentDeadlineIso(session.startsAt);
  const enrollmentOpen = isEnrollmentOpen(session.startsAt);
  const minimumCheckAt = enrollmentDeadlineAt;
  const backoutDeadlineAt = getBackoutDeadlineIso(session.startsAt);
  const backoutOpen = isBackoutOpen(session.startsAt);
  const inFillWindow = isInFillWindow(session.startsAt);
  const fillWindowStartAt = getFillWindowStartIso(session.startsAt);
  const patienceGracePending = isPatienceGracePending({
    refundsOnUnderfill: session.refundsOnUnderfill,
    ticketOnlyMinimum: session.ticketOnlyMinimum,
    minAttendeesToStart: session.minAttendeesToStart,
    peakPaidCount: session.peakPaidCount,
    currentPaidCount: ticketCount,
  });
  const patienceGraceActive =
    session.enrollmentStatus === "confirmed" &&
    registeredCount < session.minAttendeesToStart &&
    session.peakPaidCount >= session.minAttendeesToStart;

  let enrollmentLabel: string;
  if (session.enrollmentStatus === "cancelled_insufficient") {
    enrollmentLabel = session.refundsProcessed
      ? `Cancelled — needed ${session.minAttendeesToStart}, got ${registeredCount}. Refunds issued.`
      : `Cancelled — needed ${session.minAttendeesToStart}, got ${registeredCount}. Refunds processing.`;
  } else if (confirmedToRun) {
    if (patienceGraceActive) {
      enrollmentLabel = `${registeredCount} registered — class confirmed for patient group (25th seat opened; you waited through the final hour)`;
    } else if (inFillWindow) {
      enrollmentLabel = `${registeredCount} registered — confirmed · seats locked · sign-ups open until 1 hour before start`;
    } else if (enrollmentOpen) {
      enrollmentLabel = `${registeredCount} registered — class confirmed · back-out allowed until 1h 30m before start`;
    } else {
      enrollmentLabel = `${registeredCount} registered — class confirmed · starts soon`;
    }
  } else {
    const countLabel = session.ticketOnlyMinimum
      ? `${ticketCount}/${session.minAttendeesToStart} paid`
      : `${registeredCount}/${session.minAttendeesToStart} registered`;
    const needLabel =
      spotsNeeded === 1
        ? `${countLabel} — 1 more needed`
        : `${countLabel} — ${spotsNeeded} more needed`;
    if (inFillWindow) {
      enrollmentLabel = patienceGracePending
        ? `${ticketCount}/${session.minAttendeesToStart} paid — 25th seat open · class runs for waiting group if unfilled by 1 hour before start`
        : `${needLabel} · fill window — seats lock, last-minute sign-ups welcome until 1 hour before start`;
    } else if (patienceGracePending) {
      enrollmentLabel = `${ticketCount}/${session.minAttendeesToStart} paid — waiting for 1 hour check · class runs for this group if 25th seat stays open`;
    } else if (session.refundsOnUnderfill) {
      enrollmentLabel = enrollmentOpen
        ? `${needLabel} · back-out until 1h 30m before start · minimum checked 1 hour before start`
        : `${needLabel} · sign-ups closed — awaiting minimum check`;
    } else {
      enrollmentLabel = enrollmentOpen
        ? `${needLabel} · back-out until 1h 30m before start · sign-ups close 1 hour before start`
        : needLabel;
    }
  }

  return {
    minAttendeesToStart: session.minAttendeesToStart,
    registeredCount,
    ticketCount,
    interestCount,
    spotsNeeded,
    confirmedToRun,
    enrollmentStatus: session.enrollmentStatus,
    enrollmentLabel,
    enrollmentDeadlineAt,
    enrollmentOpen,
    minimumCheckAt,
    backoutDeadlineAt,
    backoutOpen,
    inFillWindow,
    fillWindowStartAt,
    peakPaidCount: session.peakPaidCount,
    patienceGracePending,
    patienceGraceActive,
  };
}

function evaluateEnrollment(session: AiLiveSession): void {
  if (session.status === "cancelled" && session.enrollmentStatus !== "cancelled_insufficient") {
    return;
  }
  syncPeakPaidCount(session);
  const registered = getRegisteredCount(session.id, session);
  const paidCount = countSessionAttendees(session.id);
  session.attendeeCount = paidCount;
  const now = Date.now();
  const start = Date.parse(session.startsAt);

  if (registered >= session.minAttendeesToStart) {
    session.enrollmentStatus = "confirmed";
    return;
  }

  const enrollmentDeadline = start - LIVE_CLASS_ENROLLMENT_CUTOFF_MS;

  if (session.refundsOnUnderfill && now >= enrollmentDeadline) {
    if (
      qualifiesForPatienceRun({
        refundsOnUnderfill: session.refundsOnUnderfill,
        ticketOnlyMinimum: session.ticketOnlyMinimum,
        minAttendeesToStart: session.minAttendeesToStart,
        peakPaidCount: session.peakPaidCount,
        currentPaidCount: paidCount,
        startsAt: session.startsAt,
        nowMs: now,
      })
    ) {
      session.enrollmentStatus = "confirmed";
      return;
    }
    session.enrollmentStatus = "cancelled_insufficient";
    session.status = "cancelled";
    return;
  }

  if (!session.refundsOnUnderfill && now >= start) {
    session.enrollmentStatus = "cancelled_insufficient";
    session.status = "cancelled";
    return;
  }

  session.enrollmentStatus = "gathering";
}

export async function refundAllSessionTickets(sessionId: string): Promise<{
  refundedCount: number;
  totalCents: number;
}> {
  const session = sessions.get(sessionId);
  if (!session || session.refundsProcessed) {
    return { refundedCount: 0, totalCents: 0 };
  }

  if (
    session.enrollmentStatus !== "cancelled_insufficient" ||
    !session.refundsOnUnderfill
  ) {
    return { refundedCount: 0, totalCents: 0 };
  }

  const stripe = getStripeIntegration();
  let refundedCount = 0;
  let totalCents = 0;

  for (const entitlement of entitlements.values()) {
    if (entitlement.sessionId !== sessionId || entitlement.refundedAt) continue;
    if (entitlement.paymentIntentId.startsWith("owner_")) {
      entitlement.refundedAt = new Date().toISOString();
      continue;
    }

    try {
      await stripe.refundPaymentIntent(
        entitlement.paymentIntentId,
        "minimum_attendance_not_met",
      );
      entitlement.refundedAt = new Date().toISOString();
      refundedCount += 1;
      totalCents += entitlement.amountCents;

      recordTransaction({
        type: "live_class_ticket",
        status: "refunded",
        amountCents: entitlement.amountCents,
        description: `Refund — ${session.title} (minimum ${session.minAttendeesToStart} not met)`,
        payerUserId: entitlement.userId,
        payerEmail: entitlement.userEmail,
        payeeUserId: session.hostUserId,
        sessionId: session.id,
        creatorAiId: session.creatorAiId,
        paymentIntentId: entitlement.paymentIntentId,
        metadata: { reason: "cancelled_insufficient" },
      });
    } catch {
      /* continue other refunds */
    }
  }

  session.refundsProcessed = refundedCount > 0 || session.refundsOnUnderfill;
  sessions.set(sessionId, session);
  interestRsvps.delete(sessionId);

  return { refundedCount, totalCents };
}

function normalizeStatus(session: AiLiveSession): LiveSessionStatus {
  evaluateEnrollment(session);
  sessions.set(session.id, session);

  const now = Date.now();
  const start = Date.parse(session.startsAt);
  const end = sessionEndsAt(session).getTime();
  if (session.status === "cancelled") return "cancelled";
  if (session.enrollmentStatus === "cancelled_insufficient") return "cancelled";
  if (session.status === "ended" || now > end) return "ended";
  if (session.enrollmentStatus !== "confirmed") return "scheduled";
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
  minAttendeesToStart?: number;
  pricingTier?: LiveClassPricingTier;
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
  try {
    assertScheduleLeadTime(params.startsAt);
  } catch (err) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: err instanceof Error ? err.message : "Start time must be at least 12 hours from now.",
    });
  }

  const durationMinutes = assertAllowedSessionDuration(
    params.durationMinutes ?? program.durationMinutes,
  );

  let pricing;
  try {
    pricing = resolveLiveClassPricing({
      pricingTier: params.pricingTier,
      priceCentsPerMinute: params.priceCentsPerMinute ?? program.priceCentsPerMinute,
      minAttendeesToStart: params.minAttendeesToStart,
      maxAttendees: params.maxAttendees ?? program.maxAttendees,
    });
  } catch (err) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: err instanceof Error ? err.message : "Invalid class pricing.",
    });
  }

  const priceCentsPerMinute = pricing.priceCentsPerMinute;
  const priceCents = computeTierTicketCents(durationMinutes, pricing);
  const maxAttendees = pricing.maxAttendees;
  const minAttendeesToStart = pricing.minAttendeesToStart;

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
    pricingTier: pricing.pricingTier,
    refundsOnUnderfill: pricing.refundsOnUnderfill,
    ticketOnlyMinimum: pricing.ticketOnlyMinimum,
    refundsProcessed: false,
    peakPaidCount: 0,
    maxAttendees,
    minAttendeesToStart,
    enrollmentStatus: "gathering",
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
  let list = [...sessions.values()].map((s) => {
    const status = normalizeStatus(s);
    if (
      s.enrollmentStatus === "cancelled_insufficient" &&
      s.refundsOnUnderfill &&
      !s.refundsProcessed
    ) {
      void refundAllSessionTickets(s.id);
    }
    return { ...s, status, enrollmentStatus: s.enrollmentStatus };
  });
  if (opts?.creatorAiId) list = list.filter((s) => s.creatorAiId === opts.creatorAiId);
  if (opts?.upcomingOnly) {
    list = list.filter((s) => s.status === "scheduled" || s.status === "live");
  }
  return list.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

export function getLiveSession(sessionId: string): AiLiveSession | null {
  const s = sessions.get(sessionId);
  if (!s) return null;
  const status = normalizeStatus(s);
  return { ...s, status, enrollmentStatus: s.enrollmentStatus };
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
    if (e.sessionId === sessionId && !e.refundedAt) n += 1;
  }
  return n;
}

export function userHasSessionAccess(sessionId: string, userId: string): boolean {
  for (const e of entitlements.values()) {
    if (e.sessionId === sessionId && e.userId === userId && !e.refundedAt) return true;
  }
  return false;
}

export function expressInterestInSession(params: {
  sessionId: string;
  userId: string;
}): { ok: true; registeredCount: number; spotsNeeded: number } {
  const session = getLiveSession(params.sessionId);
  if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
  if (session.status === "cancelled" || session.status === "ended") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This class is no longer open." });
  }
  if (session.enrollmentStatus === "cancelled_insufficient") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This class was cancelled — minimum attendance was not met.",
    });
  }
  try {
    assertEnrollmentOpen(session.startsAt);
  } catch (err) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: err instanceof Error ? err.message : "Sign-ups closed for this class.",
    });
  }
  if (session.ticketOnlyMinimum) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Group appointments require a paid ticket. At least ${session.minAttendeesToStart} paid signups are needed for the class to run — everyone is refunded if the minimum is not met.`,
    });
  }
  if (userHasSessionAccess(params.sessionId, params.userId)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You already have a ticket for this class." });
  }
  const sold = countSessionAttendees(params.sessionId);
  const rsvps = countInterestRsvps(params.sessionId);
  if (sold + rsvps >= session.maxAttendees) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This class is full." });
  }

  if (!interestRsvps.has(params.sessionId)) {
    interestRsvps.set(params.sessionId, new Set());
  }
  interestRsvps.get(params.sessionId)!.add(params.userId);

  const updated = getLiveSession(params.sessionId)!;
  const summary = getSessionEnrollmentSummary(updated);
  return { ok: true, registeredCount: summary.registeredCount, spotsNeeded: summary.spotsNeeded };
}

export function cancelInterestInSession(params: {
  sessionId: string;
  userId: string;
}): { ok: true; registeredCount: number } {
  const session = getLiveSession(params.sessionId);
  if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
  try {
    assertBackoutOpen(session.startsAt);
  } catch (err) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: err instanceof Error ? err.message : "Back-out is no longer allowed for this class.",
    });
  }
  const set = interestRsvps.get(params.sessionId);
  if (set) {
    set.delete(params.userId);
  }
  if (session) {
    evaluateEnrollment(session);
    sessions.set(params.sessionId, session);
  }
  const registeredCount = session ? getRegisteredCount(params.sessionId, session) : 0;
  return { ok: true, registeredCount };
}

export async function backOutOfLiveSession(params: {
  sessionId: string;
  userId: string;
  userEmail: string;
}): Promise<{ ok: true; registeredCount: number; refunded: boolean }> {
  const session = sessions.get(params.sessionId);
  if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
  if (session.status === "cancelled" || session.status === "ended") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This class is no longer open." });
  }
  if (session.enrollmentStatus === "cancelled_insufficient") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This class was cancelled — minimum attendance was not met.",
    });
  }
  try {
    assertBackoutOpen(session.startsAt);
  } catch (err) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: err instanceof Error ? err.message : "Back-out is no longer allowed for this class.",
    });
  }

  const entitlementKey = `${params.sessionId}:${params.userId}`;
  const entitlement = entitlements.get(entitlementKey);
  let refunded = false;

  if (entitlement && !entitlement.refundedAt) {
    if (
      entitlement.paymentIntentId.startsWith("owner_") ||
      entitlement.paymentIntentId.startsWith("free_")
    ) {
      entitlement.refundedAt = new Date().toISOString();
      entitlements.delete(entitlementKey);
    } else {
      const stripe = getStripeIntegration();
      await stripe.refundPaymentIntent(entitlement.paymentIntentId, "voluntary_backout");
      entitlement.refundedAt = new Date().toISOString();
      entitlements.delete(entitlementKey);
      refunded = true;
      recordTransaction({
        type: "live_class_ticket",
        status: "refunded",
        amountCents: entitlement.amountCents,
        description: `Voluntary back-out — ${session.title}`,
        payerUserId: params.userId,
        payerEmail: params.userEmail,
        payeeUserId: session.hostUserId,
        sessionId: session.id,
        creatorAiId: session.creatorAiId,
        paymentIntentId: entitlement.paymentIntentId,
        metadata: { reason: "voluntary_backout" },
      });
    }
  } else if (interestRsvps.get(params.sessionId)?.has(params.userId)) {
    interestRsvps.get(params.sessionId)!.delete(params.userId);
  } else {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You do not have a ticket or reservation for this class.",
    });
  }

  session.attendeeCount = countSessionAttendees(params.sessionId);
  syncPeakPaidCount(session);
  evaluateEnrollment(session);
  sessions.set(params.sessionId, session);

  const registeredCount = getRegisteredCount(params.sessionId, session);
  return { ok: true, registeredCount, refunded };
}

export function userHasInterestInSession(sessionId: string, userId: string): boolean {
  return interestRsvps.get(sessionId)?.has(userId) ?? false;
}

export async function createSessionCheckout(params: {
  sessionId: string;
  userId: string;
  userEmail: string;
  userName: string;
  isPlatformOwner: boolean;
  billingStateCode?: string;
  attributionSlug?: string;
}) {
  const session = getLiveSession(params.sessionId);
  if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
  if (session.status === "cancelled" || session.status === "ended") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This session is no longer available." });
  }
  if (session.enrollmentStatus === "cancelled_insufficient") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This class was cancelled because the minimum number of attendees was not met.",
    });
  }
  try {
    assertEnrollmentOpen(session.startsAt);
  } catch (err) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: err instanceof Error ? err.message : "Ticket sales closed for this class.",
    });
  }
  if (userHasSessionAccess(params.sessionId, params.userId)) {
    return { mode: "already_purchased" as const, sessionId: params.sessionId };
  }
  const sold = getRegisteredCount(params.sessionId, session);
  if (sold >= session.maxAttendees) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This session is sold out." });
  }

  if (
    session.pricingTier === "group_appointment" &&
    session.priceCentsPerMinute < GROUP_APPOINTMENT_MIN_PRICE_CENTS_PER_MINUTE
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This group appointment is below the $0.01/min floor and cannot be sold.",
    });
  }

  if (
    session.pricingTier === "standard" &&
    session.priceCentsPerMinute < STANDARD_MIN_PRICE_CENTS_PER_MINUTE
  ) {
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
      amountCents: session.priceCents,
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

  if (session.priceCents === 0) {
    grantSessionEntitlement({
      sessionId: params.sessionId,
      userId: params.userId,
      userEmail: params.userEmail,
      paymentIntentId: `free_${randomUUID()}`,
      amountCents: 0,
    });
    return { mode: "granted" as const, sessionId: params.sessionId };
  }

  const stateCode = normalizeStateCode(params.billingStateCode);
  if (!stateCode) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select your billing state to calculate taxes and complete checkout.",
    });
  }
  const checkout = calculateCustomerCheckout(session.priceCents, stateCode);

  const stripe = getStripeIntegration();
  const customer = await stripe.getOrCreateCustomer(
    params.userId,
    params.userEmail,
    params.userName || "UR User",
  );
  const intent = await stripe.createPaymentIntent(customer.id, checkout.totalCents, "USD", {
    userId: params.userId,
    product: "ai_live_session",
    sessionId: params.sessionId,
    creatorAiId: session.creatorAiId,
    subtotalCents: String(session.priceCents),
    billingStateCode: stateCode,
  });
  pendingPayments.set(intent.id, {
    sessionId: params.sessionId,
    userId: params.userId,
    amountCents: checkout.totalCents,
    subtotalCents: session.priceCents,
    billingStateCode: stateCode,
    attributionSlug: params.attributionSlug,
  });
  return {
    mode: "checkout" as const,
    paymentIntentId: intent.id,
    clientSecret: intent.clientSecret,
    amountCents: checkout.totalCents,
    subtotalCents: session.priceCents,
    pricing: checkout,
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
    amountCents: pending.amountCents,
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
  amountCents: number;
}) {
  const key = `${params.sessionId}:${params.userId}`;
  entitlements.set(key, {
    sessionId: params.sessionId,
    userId: params.userId,
    userEmail: params.userEmail,
    paymentIntentId: params.paymentIntentId,
    amountCents: params.amountCents,
    grantedAt: new Date().toISOString(),
  });
  interestRsvps.get(params.sessionId)?.delete(params.userId);
  const session = sessions.get(params.sessionId);
  if (session) {
    syncPeakPaidCount(session);
    session.attendeeCount = countSessionAttendees(params.sessionId);
    evaluateEnrollment(session);
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

  if (session.enrollmentStatus === "cancelled_insufficient") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This class was cancelled — not enough people registered.",
    });
  }

  const hasAccess =
    params.isPlatformOwner || userHasSessionAccess(params.sessionId, params.userId);
  const now = Date.now();
  const start = Date.parse(session.startsAt);
  const end = sessionEndsAt(session).getTime();
  const committedEnd = sessionCommittedEndsAt(session).getTime();
  const enrollment = getSessionEnrollmentSummary(session);
  const canEnter =
    hasAccess &&
    enrollment.confirmedToRun &&
    now >= start - 15 * 60_000 &&
    now <= end;
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
    enrollment,
    opensAt: new Date(start - 15 * 60_000).toISOString(),
    endsAt: new Date(end).toISOString(),
    committedEndsAt: commitment.committedEndsAt,
    commitment,
    roomCode: hasAccess && enrollment.confirmedToRun ? session.roomCode : null,
    joinPath: hasAccess && enrollment.confirmedToRun ? `/live-session/${session.id}` : null,
    hostPrompt: hasAccess ? hostPrompt : null,
    message: !hasAccess
      ? "Purchase a ticket to join this live class."
      : !enrollment.confirmedToRun
        ? enrollment.enrollmentLabel
        : now < start - 15 * 60_000
          ? `Lobby opens 15 minutes before start (${new Date(start).toLocaleString()}). ${enrollment.enrollmentLabel}`
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
