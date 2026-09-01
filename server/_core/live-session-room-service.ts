/**
 * Live class room — dual question queues, speak access, overtime opt-in metering.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  buildOvertimeNotice,
  getLiveSessionRoomPhase,
  LIVE_SESSION_OVERTIME_DISCLOSURE,
  LIVE_SESSION_SPEAK_DISCLOSURE,
  LIVE_SESSION_TEXT_QUEUE_DISCLOSURE,
  type LiveSessionQuestionChannel,
} from "../../lib/live-session-room-policy";
import { getLiveSession, userHasSessionAccess } from "./ai-live-session-service";
import { getTalkTimeStatus, purchaseAiTalkPack } from "./ai-premium-media-service";
import { sanitizeUserText } from "./input-sanitize";
import { assertSimulatedPurchaseAllowed, assertPaymentChannelAllowed } from "./payment-channel-guard";
import { getAiTalkPack } from "../../lib/ai-talk-pricing";
import {
  formatTalkTimeRemaining,
  getTalkLowBalanceNotice,
  isTalkTimeLowBalance,
} from "../../lib/ai-talk-time-policy";

export type LiveSessionQuestionStatus = "queued" | "active" | "answered";

export type LiveSessionQuestion = {
  id: string;
  sessionId: string;
  userId: string;
  userLabel: string;
  channel: LiveSessionQuestionChannel;
  questionText: string;
  status: LiveSessionQuestionStatus;
  queuePosition: number;
  createdAt: string;
  answeredAt?: string;
};

type AttendeeRoomState = {
  sessionId: string;
  userId: string;
  overtimeOptIn: boolean;
  overtimeOptInAt?: string;
  overtimeLastTickAt?: string;
  overtimeMinutesAccrued: number;
  overtimeCentsAccrued: number;
  leftAt?: string;
};

const questions = new Map<string, LiveSessionQuestion>();
const sessionQuestionOrder = new Map<string, string[]>();
const attendeeStates = new Map<string, AttendeeRoomState>();

function attendeeKey(sessionId: string, userId: string): string {
  return `${sessionId}:${userId}`;
}

function getOrCreateAttendeeState(sessionId: string, userId: string): AttendeeRoomState {
  const key = attendeeKey(sessionId, userId);
  let state = attendeeStates.get(key);
  if (!state) {
    state = {
      sessionId,
      userId,
      overtimeOptIn: false,
      overtimeMinutesAccrued: 0,
      overtimeCentsAccrued: 0,
    };
    attendeeStates.set(key, state);
  }
  return state;
}

function assertRoomAccess(params: {
  sessionId: string;
  userId: string;
  isPlatformOwner: boolean;
}): NonNullable<ReturnType<typeof getLiveSession>> {
  const session = getLiveSession(params.sessionId);
  if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
  if (!params.isPlatformOwner && !userHasSessionAccess(params.sessionId, params.userId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Ticket required to join this room." });
  }
  return session;
}

function orderedQuestionIds(sessionId: string): string[] {
  const ids = sessionQuestionOrder.get(sessionId) ?? [];
  const items = ids
    .map((id) => questions.get(id))
    .filter((q): q is LiveSessionQuestion => Boolean(q) && q.status !== "answered");

  const voice = items
    .filter((q) => q.channel === "voice")
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const text = items
    .filter((q) => q.channel === "text")
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  return [...voice, ...text].map((q) => q.id);
}

function refreshQueuePositions(sessionId: string): void {
  const ordered = orderedQuestionIds(sessionId);
  ordered.forEach((id, index) => {
    const q = questions.get(id);
    if (!q) return;
    q.queuePosition = index + 1;
    if (index === 0 && q.status === "queued") {
      q.status = "active";
    } else if (index > 0 && q.status === "active") {
      q.status = "queued";
    }
    questions.set(id, q);
  });
}

function tickOvertimeMeter(
  state: AttendeeRoomState,
  priceCentsPerMinute: number,
  nowMs: number,
): void {
  if (!state.overtimeOptIn || state.leftAt) return;
  const last = state.overtimeLastTickAt
    ? Date.parse(state.overtimeLastTickAt)
    : state.overtimeOptInAt
      ? Date.parse(state.overtimeOptInAt)
      : nowMs;
  const elapsedMs = Math.max(0, nowMs - last);
  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes <= 0) return;
  state.overtimeMinutesAccrued += minutes;
  state.overtimeCentsAccrued += minutes * priceCentsPerMinute;
  state.overtimeLastTickAt = new Date(last + minutes * 60_000).toISOString();
}

function userHasSpeakAccess(userId: string, isPlatformOwner: boolean): boolean {
  if (isPlatformOwner) return true;
  const talk = getTalkTimeStatus(userId);
  return talk.millisecondsRemaining > 0;
}

export function getLiveSessionRoomState(params: {
  sessionId: string;
  userId: string;
  userLabel: string;
  isPlatformOwner: boolean;
}) {
  const session = assertRoomAccess(params);
  const phaseInfo = getLiveSessionRoomPhase({
    startsAt: session.startsAt,
    committedDurationMinutes: session.committedDurationMinutes,
    overtimeMinutes: session.overtimeMinutes,
    allowOvertime: session.allowOvertime,
  });

  const state = getOrCreateAttendeeState(params.sessionId, params.userId);
  if (phaseInfo.pastCommittedEnd && session.allowOvertime) {
    tickOvertimeMeter(state, session.priceCentsPerMinute, Date.now());
    attendeeStates.set(attendeeKey(params.sessionId, params.userId), state);
  }

  refreshQueuePositions(params.sessionId);
  const ordered = orderedQuestionIds(params.sessionId);
  const queue = ordered
    .map((id) => questions.get(id)!)
    .filter(Boolean)
    .map((q) => ({
      id: q.id,
      channel: q.channel,
      userLabel: q.userLabel,
      status: q.status,
      queuePosition: q.queuePosition,
      questionPreview:
        q.questionText.length > 80 ? `${q.questionText.slice(0, 77)}…` : q.questionText,
      isMine: q.userId === params.userId,
    }));

  const myQuestions = [...questions.values()].filter(
    (q) => q.sessionId === params.sessionId && q.userId === params.userId,
  );

  const talk = getTalkTimeStatus(params.userId);
  const hasSpeak = userHasSpeakAccess(params.userId, params.isPlatformOwner);
  const activeMine = myQuestions.find((q) => q.status === "active");
  const canLeaveAfterHour =
    phaseInfo.pastCommittedEnd &&
    (state.leftAt != null ||
      !state.overtimeOptIn ||
      myQuestions.some((q) => q.status === "answered") ||
      (activeMine == null && myQuestions.every((q) => q.status !== "queued")));

  return {
    sessionId: session.id,
    phase: phaseInfo.phase,
    showOvertimeNotice: phaseInfo.showOvertimeNotice,
    overtimeNotice: phaseInfo.showOvertimeNotice
      ? buildOvertimeNotice({
          priceCentsPerMinute: session.priceCentsPerMinute,
          committedDurationMinutes: session.committedDurationMinutes,
        })
      : null,
    committedMinutesRemaining: phaseInfo.committedMinutesRemaining,
    elapsedCommittedMinutes: phaseInfo.elapsedCommittedMinutes,
    committedEndsAt: phaseInfo.committedEndsAt,
    actualEndsAt: phaseInfo.actualEndsAt,
    allowOvertime: session.allowOvertime,
    priceCentsPerMinute: session.priceCentsPerMinute,
    pricePerMinuteDisplay: `$${(session.priceCentsPerMinute / 100).toFixed(2)}/min`,
    speak: {
      hasAccess: hasSpeak,
      minutesRemainingDisplay: params.isPlatformOwner
        ? "Unlimited (owner)"
        : formatTalkTimeRemaining(talk.millisecondsRemaining),
      millisecondsRemaining: params.isPlatformOwner ? null : talk.millisecondsRemaining,
      lowBalance: !params.isPlatformOwner && isTalkTimeLowBalance(talk.millisecondsRemaining),
      lowBalanceNotice: params.isPlatformOwner
        ? null
        : getTalkLowBalanceNotice(talk.millisecondsRemaining),
      packPriceCents: 500,
      disclosure: LIVE_SESSION_SPEAK_DISCLOSURE,
    },
    overtime: {
      optedIn: state.overtimeOptIn,
      leftAt: state.leftAt ?? null,
      minutesAccrued: state.overtimeMinutesAccrued,
      centsAccrued: state.overtimeCentsAccrued,
      accruedDisplay: `$${(state.overtimeCentsAccrued / 100).toFixed(2)}`,
      disclosure: LIVE_SESSION_OVERTIME_DISCLOSURE,
      canOptIn:
        session.allowOvertime &&
        (phaseInfo.phase === "overtime_warning" || phaseInfo.phase === "overtime") &&
        !state.overtimeOptIn &&
        !state.leftAt,
      canLeave:
        phaseInfo.pastCommittedEnd && !state.leftAt && (state.overtimeOptIn || canLeaveAfterHour),
    },
    textQueueDisclosure: LIVE_SESSION_TEXT_QUEUE_DISCLOSURE,
    queue,
    myQuestions: myQuestions.map((q) => ({
      id: q.id,
      channel: q.channel,
      status: q.status,
      queuePosition: q.queuePosition,
      questionText: q.questionText,
      canMarkAnswered: q.status === "active" && q.userId === params.userId,
    })),
  };
}

export function submitLiveSessionQuestion(params: {
  sessionId: string;
  userId: string;
  userLabel: string;
  isPlatformOwner: boolean;
  channel: LiveSessionQuestionChannel;
  questionText: string;
}): LiveSessionQuestion {
  const session = assertRoomAccess(params);
  const phase = getLiveSessionRoomPhase({
    startsAt: session.startsAt,
    committedDurationMinutes: session.committedDurationMinutes,
    overtimeMinutes: session.overtimeMinutes,
    allowOvertime: session.allowOvertime,
  });
  if (phase.phase === "ended" || phase.phase === "lobby") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Questions are not open right now." });
  }

  const state = getOrCreateAttendeeState(params.sessionId, params.userId);
  if (state.leftAt) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You already left this session." });
  }
  if (phase.pastCommittedEnd && session.allowOvertime && !state.overtimeOptIn) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Opt in to overtime Q&A to ask questions after the committed hour.",
    });
  }

  if (params.channel === "voice" && !userHasSpeakAccess(params.userId, params.isPlatformOwner)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Purchase talk time ($1 / 5 min, $5 / 25 min, $120 / 500 min, or $200 / 1,000 min) to ask voice questions and speak with the AI.",
    });
  }

  const text = sanitizeUserText(params.questionText, 500);
  if (text.length < 4) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Question must be at least 4 characters." });
  }

  const pending = [...questions.values()].filter(
    (q) =>
      q.sessionId === params.sessionId &&
      q.userId === params.userId &&
      (q.status === "queued" || q.status === "active"),
  );
  if (pending.length >= 2) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You already have questions in the queue. Wait until one is answered.",
    });
  }

  const id = randomUUID();
  const question: LiveSessionQuestion = {
    id,
    sessionId: params.sessionId,
    userId: params.userId,
    userLabel: sanitizeUserText(params.userLabel, 64) || "Attendee",
    channel: params.channel,
    questionText: text,
    status: "queued",
    queuePosition: 0,
    createdAt: new Date().toISOString(),
  };
  questions.set(id, question);
  const order = sessionQuestionOrder.get(params.sessionId) ?? [];
  order.push(id);
  sessionQuestionOrder.set(params.sessionId, order);
  refreshQueuePositions(params.sessionId);
  return questions.get(id)!;
}

export function markLiveSessionQuestionAnswered(params: {
  sessionId: string;
  userId: string;
  questionId: string;
  isPlatformOwner: boolean;
}): { ok: true } {
  assertRoomAccess(params);
  const q = questions.get(params.questionId);
  if (!q || q.sessionId !== params.sessionId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Question not found." });
  }
  if (q.userId !== params.userId && !params.isPlatformOwner) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not your question." });
  }
  if (q.status !== "active" && q.status !== "queued") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Question is already answered." });
  }
  q.status = "answered";
  q.answeredAt = new Date().toISOString();
  questions.set(q.id, q);
  refreshQueuePositions(params.sessionId);
  return { ok: true };
}

export function optIntoLiveSessionOvertime(params: {
  sessionId: string;
  userId: string;
  isPlatformOwner: boolean;
}): { ok: true; message: string } {
  const session = assertRoomAccess(params);
  if (!session.allowOvertime) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This class does not offer overtime Q&A." });
  }
  const phase = getLiveSessionRoomPhase({
    startsAt: session.startsAt,
    committedDurationMinutes: session.committedDurationMinutes,
    overtimeMinutes: session.overtimeMinutes,
    allowOvertime: session.allowOvertime,
  });
  if (phase.phase !== "overtime_warning" && phase.phase !== "overtime") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Overtime Q&A is not open yet. Wait for the notice near the end of class.",
    });
  }

  const state = getOrCreateAttendeeState(params.sessionId, params.userId);
  if (state.leftAt) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You already left this session." });
  }
  if (!state.overtimeOptIn) {
    state.overtimeOptIn = true;
    state.overtimeOptInAt = new Date().toISOString();
    state.overtimeLastTickAt = state.overtimeOptInAt;
    attendeeStates.set(attendeeKey(params.sessionId, params.userId), state);
  }

  const rate = `$${(session.priceCentsPerMinute / 100).toFixed(2)}/min`;
  return {
    ok: true,
    message: `You are staying for bonus Q&A at ${rate} pay-as-you-go. Leave anytime after your question is answered.`,
  };
}

export function leaveLiveSessionRoom(params: {
  sessionId: string;
  userId: string;
  isPlatformOwner: boolean;
}): { ok: true; overtimeCentsAccrued: number } {
  const session = assertRoomAccess(params);
  const state = getOrCreateAttendeeState(params.sessionId, params.userId);
  const phase = getLiveSessionRoomPhase({
    startsAt: session.startsAt,
    committedDurationMinutes: session.committedDurationMinutes,
    overtimeMinutes: session.overtimeMinutes,
    allowOvertime: session.allowOvertime,
  });

  if (phase.pastCommittedEnd && state.overtimeOptIn) {
    tickOvertimeMeter(state, session.priceCentsPerMinute, Date.now());
  }

  state.leftAt = new Date().toISOString();
  attendeeStates.set(attendeeKey(params.sessionId, params.userId), state);

  for (const q of questions.values()) {
    if (
      q.sessionId === params.sessionId &&
      q.userId === params.userId &&
      (q.status === "queued" || q.status === "active")
    ) {
      q.status = "answered";
      q.answeredAt = state.leftAt;
      questions.set(q.id, q);
    }
  }
  refreshQueuePositions(params.sessionId);

  return { ok: true, overtimeCentsAccrued: state.overtimeCentsAccrued };
}

export function purchaseLiveSessionSpeakAccess(params: {
  sessionId: string;
  userId: string;
  userEmail: string;
  isPlatformOwner: boolean;
  billingStateCode: string;
  clientPlatform: "web" | "native";
}) {
  assertRoomAccess(params);
  if (params.isPlatformOwner) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Platform owner has unlimited speak access.",
    });
  }

  assertSimulatedPurchaseAllowed();
  const pack = getAiTalkPack("talk_5");
  assertPaymentChannelAllowed({
    subtotalCents: pack.priceCents,
    clientPlatform: params.clientPlatform,
  });

  const entitlement = purchaseAiTalkPack({
    userId: params.userId,
    userEmail: params.userEmail,
    packId: "talk_5",
    billingStateCode: params.billingStateCode,
  });

  const talk = getTalkTimeStatus(params.userId);
  return {
    ok: true as const,
    entitlement,
    minutesRemainingDisplay: formatTalkTimeRemaining(talk.millisecondsRemaining),
    message: "You can now speak with the AI and join the voice question queue.",
  };
}

/** Saved class Q&A for pay-per-view replay (no user IDs). */
export function listSessionReplayChapters(sessionId: string): Array<{ label: string; text: string }> {
  return [...questions.values()]
    .filter((q) => q.sessionId === sessionId)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .map((q) => ({
      label: q.userLabel || "Attendee",
      text: sanitizeUserText(q.questionText, 800),
    }))
    .filter((c) => c.text.length > 0);
}

/** Test helper — clears in-memory room state. */
export function _resetLiveSessionRoomStoreForTests(): void {
  questions.clear();
  sessionQuestionOrder.clear();
  attendeeStates.clear();
}
