/**
 * Live class room — question queues, speak access, and overtime Q&A policy.
 */

export const OVERTIME_WARNING_MINUTES_BEFORE_END = 2;

/** Minimum room stay open for pay-as-you-go Q&A after the committed hour. */
export const ATTENDEE_OVERTIME_QA_MINUTES = 30;

export type LiveSessionRoomPhase =
  | "lobby"
  | "committed"
  | "overtime_warning"
  | "overtime"
  | "ended";

export type LiveSessionQuestionChannel = "voice" | "text";

export type LiveSessionRoomPhaseInfo = {
  phase: LiveSessionRoomPhase;
  /** Minutes elapsed since class start (floor). */
  elapsedCommittedMinutes: number;
  /** Minutes left in the committed block (ceil). */
  committedMinutesRemaining: number;
  /** True when the 2-minute-before-end notice should show. */
  showOvertimeNotice: boolean;
  /** True when committed duration has passed. */
  pastCommittedEnd: boolean;
  committedEndsAt: string;
  actualEndsAt: string;
};

export function getEffectiveOvertimeMinutes(params: {
  overtimeMinutes: number;
  allowOvertime: boolean;
}): number {
  return params.allowOvertime
    ? Math.max(params.overtimeMinutes, ATTENDEE_OVERTIME_QA_MINUTES)
    : params.overtimeMinutes;
}

export function getLiveSessionRoomPhase(params: {
  startsAt: string;
  committedDurationMinutes: number;
  overtimeMinutes: number;
  allowOvertime: boolean;
  nowMs?: number;
}): LiveSessionRoomPhaseInfo {
  const now = params.nowMs ?? Date.now();
  const start = Date.parse(params.startsAt);
  const committedMs = params.committedDurationMinutes * 60_000;
  const committedEndsAt = start + committedMs;
  const effectiveOvertimeMinutes = getEffectiveOvertimeMinutes({
    overtimeMinutes: params.overtimeMinutes,
    allowOvertime: params.allowOvertime,
  });
  const actualEndsAt = committedEndsAt + effectiveOvertimeMinutes * 60_000;
  const warningStartsAt =
    committedEndsAt - OVERTIME_WARNING_MINUTES_BEFORE_END * 60_000;

  const elapsedMs = Math.max(0, now - start);
  const elapsedCommittedMinutes = Math.floor(elapsedMs / 60_000);
  const committedRemainingMs = Math.max(0, committedEndsAt - now);
  const committedMinutesRemaining = Math.ceil(committedRemainingMs / 60_000);
  const pastCommittedEnd = now >= committedEndsAt;
  const showOvertimeNotice =
    params.allowOvertime && now >= warningStartsAt && now < actualEndsAt;

  let phase: LiveSessionRoomPhase;
  if (now < start - 15 * 60_000) {
    phase = "lobby";
  } else if (now >= actualEndsAt) {
    phase = "ended";
  } else if (pastCommittedEnd) {
    phase = "overtime";
  } else if (showOvertimeNotice) {
    phase = "overtime_warning";
  } else {
    phase = "committed";
  }

  return {
    phase,
    elapsedCommittedMinutes,
    committedMinutesRemaining,
    showOvertimeNotice,
    pastCommittedEnd,
    committedEndsAt: new Date(committedEndsAt).toISOString(),
    actualEndsAt: new Date(actualEndsAt).toISOString(),
  };
}

export function formatPricePerMinute(cents: number): string {
  return `$${(cents / 100).toFixed(2)}/min`;
}

export function buildOvertimeNotice(params: {
  priceCentsPerMinute: number;
  committedDurationMinutes: number;
}): string {
  const rate = formatPricePerMinute(params.priceCentsPerMinute);
  return (
    `${params.committedDurationMinutes - OVERTIME_WARNING_MINUTES_BEFORE_END} minutes in — ` +
    `the committed hour ends soon. The host may stay for bonus Q&A after the class. ` +
    `If you stay, it is pay-as-you-go at the same ${rate} rate you already committed to. ` +
    `Once your question is answered, you may leave anytime.`
  );
}

export const LIVE_SESSION_SPEAK_DISCLOSURE =
  "Voice back-and-forth with the AI in this group class requires purchased talk time ($1 / 5 min, $5 / 25 min, $120 / 500 min, or $200 / 1,000 min). " +
  "Voice questions are answered before text questions in the queue.";

export const LIVE_SESSION_OVERTIME_DISCLOSURE =
  "After the committed class hour, optional Q&A is pay-as-you-go at your ticket's per-minute rate. " +
  "Leave whenever you want once your question has been answered.";

export const LIVE_SESSION_TEXT_QUEUE_DISCLOSURE =
  "Text questions join a separate queue. Voice speakers go first, then text questions in order.";
