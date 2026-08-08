/**
 * Live class scheduling & enrollment windows.
 */

export const LIVE_CLASS_MIN_SCHEDULE_AHEAD_MS = 12 * 60 * 60 * 1000;
/** Sign-ups close and minimum headcount is checked at this point before start. */
export const LIVE_CLASS_ENROLLMENT_CUTOFF_MS = 60 * 60 * 1000;
/** After this point before start, paid seats are locked — no voluntary back-out. */
export const LIVE_CLASS_BACKOUT_CUTOFF_MS = 90 * 60 * 1000;
/** 30-minute window: no back-outs, but new sign-ups can fill vacated seats. */
export const LIVE_CLASS_FILL_WINDOW_MS =
  LIVE_CLASS_BACKOUT_CUTOFF_MS - LIVE_CLASS_ENROLLMENT_CUTOFF_MS;

export function getEnrollmentDeadlineIso(startsAt: string): string {
  return new Date(Date.parse(startsAt) - LIVE_CLASS_ENROLLMENT_CUTOFF_MS).toISOString();
}

export function getBackoutDeadlineIso(startsAt: string): string {
  return new Date(Date.parse(startsAt) - LIVE_CLASS_BACKOUT_CUTOFF_MS).toISOString();
}

export function getFillWindowStartIso(startsAt: string): string {
  return getBackoutDeadlineIso(startsAt);
}

export function getFillWindowEndIso(startsAt: string): string {
  return getEnrollmentDeadlineIso(startsAt);
}

export function getMinimumConfirmationIso(startsAt: string): string {
  return getEnrollmentDeadlineIso(startsAt);
}

export function assertScheduleLeadTime(startsAt: string, nowMs = Date.now()): void {
  const start = Date.parse(startsAt);
  if (Number.isNaN(start)) {
    throw new Error("Invalid start time.");
  }
  if (start < nowMs + LIVE_CLASS_MIN_SCHEDULE_AHEAD_MS) {
    throw new Error(
      "Classes must be scheduled at least 12 hours in advance so attendees have time to sign up.",
    );
  }
}

export function isEnrollmentOpen(startsAt: string, nowMs = Date.now()): boolean {
  const deadline = Date.parse(startsAt) - LIVE_CLASS_ENROLLMENT_CUTOFF_MS;
  return nowMs < deadline;
}

export function isBackoutOpen(startsAt: string, nowMs = Date.now()): boolean {
  const deadline = Date.parse(startsAt) - LIVE_CLASS_BACKOUT_CUTOFF_MS;
  return nowMs < deadline;
}

export function isInFillWindow(startsAt: string, nowMs = Date.now()): boolean {
  const start = Date.parse(startsAt);
  const fillStart = start - LIVE_CLASS_BACKOUT_CUTOFF_MS;
  const fillEnd = start - LIVE_CLASS_ENROLLMENT_CUTOFF_MS;
  return nowMs >= fillStart && nowMs < fillEnd;
}

export function assertEnrollmentOpen(startsAt: string, nowMs = Date.now()): void {
  if (!isEnrollmentOpen(startsAt, nowMs)) {
    throw new Error(
      "Ticket sales closed — sign-ups end 1 hour before class start. If the minimum was not met, paid tickets are refunded.",
    );
  }
}

export function assertBackoutOpen(startsAt: string, nowMs = Date.now()): void {
  if (!isBackoutOpen(startsAt, nowMs)) {
    throw new Error(
      "Back-out closed — seats lock 1 hour 30 minutes before class start. After that you must attend; new sign-ups can still join for 30 minutes to fill open seats.",
    );
  }
}

export function isMinimumCheckDue(startsAt: string, nowMs = Date.now()): boolean {
  return nowMs >= Date.parse(startsAt) - LIVE_CLASS_ENROLLMENT_CUTOFF_MS;
}

/**
 * Group appointment had full paid minimum, exactly one seat opened (25th dropped out),
 * and the fill window has ended — remaining attendees waited patiently; class may run at min−1.
 */
export function qualifiesForPatienceRun(params: {
  refundsOnUnderfill: boolean;
  ticketOnlyMinimum: boolean;
  minAttendeesToStart: number;
  peakPaidCount: number;
  currentPaidCount: number;
  startsAt: string;
  nowMs?: number;
}): boolean {
  const nowMs = params.nowMs ?? Date.now();
  if (!params.refundsOnUnderfill || !params.ticketOnlyMinimum) return false;
  if (params.peakPaidCount < params.minAttendeesToStart) return false;
  if (params.currentPaidCount !== params.minAttendeesToStart - 1) return false;
  return isMinimumCheckDue(params.startsAt, nowMs);
}

/** Had full minimum but one paid seat opened — waiting through fill window / final hour. */
export function isPatienceGracePending(params: {
  refundsOnUnderfill: boolean;
  ticketOnlyMinimum: boolean;
  minAttendeesToStart: number;
  peakPaidCount: number;
  currentPaidCount: number;
}): boolean {
  if (!params.refundsOnUnderfill || !params.ticketOnlyMinimum) return false;
  if (params.peakPaidCount < params.minAttendeesToStart) return false;
  return params.currentPaidCount === params.minAttendeesToStart - 1;
}

export const LIVE_CLASS_SCHEDULING_RULES_SUMMARY =
  "Classes must be scheduled at least 12 hours ahead. Ticket sales close 1 hour before start.";

export const LIVE_CLASS_BACKOUT_RULE_SUMMARY =
  "You may back out and release your seat until 1 hour 30 minutes before class start (full refund when you back out in time). After that, your seat is locked and you must attend.";

export const LIVE_CLASS_FILL_WINDOW_RULE_SUMMARY =
  "From 1 hour 30 minutes to 1 hour before start, seats are locked for existing attendees — no back-outs — but new sign-ups can still join to fill any open seats.";

export const LIVE_CLASS_GROUP_REFUND_RULE_SUMMARY =
  "Group appointments need 25 paid signups 1 hour before start. If the minimum is never met, the class is cancelled and everyone is refunded. If you had 25 and only the 25th person backs out, the remaining 24 who waited through the final hour still get the class.";

export const LIVE_CLASS_PATIENCE_GRACE_RULE_SUMMARY =
  "If a group class reached 25 paid signups and the 25th seat opens, the 24 remaining attendees who wait through the final 30-minute fill window (and through the 1-hour-before-start check) still get the class — only when the drop-out was that last seat, not when the group never filled.";

export const LIVE_CLASS_NO_REFUND_AFTER_LOCKIN_SUMMARY =
  "After 1 hour 30 minutes before start, tickets are final — no back-outs, no refunds. You must attend the live class.";

export const LIVE_CLASS_PURCHASE_RULES: string[] = [
  LIVE_CLASS_SCHEDULING_RULES_SUMMARY,
  LIVE_CLASS_BACKOUT_RULE_SUMMARY,
  LIVE_CLASS_FILL_WINDOW_RULE_SUMMARY,
  "New sign-ups are accepted until 1 hour before class start.",
  LIVE_CLASS_NO_REFUND_AFTER_LOCKIN_SUMMARY,
  LIVE_CLASS_PATIENCE_GRACE_RULE_SUMMARY,
  LIVE_CLASS_GROUP_REFUND_RULE_SUMMARY,
  "Sales tax (when applicable) and Stripe processing fees are added to your total at checkout — you pay the full amount shown before confirming.",
  "AI hosts stay for the full committed class length once the session runs.",
];
