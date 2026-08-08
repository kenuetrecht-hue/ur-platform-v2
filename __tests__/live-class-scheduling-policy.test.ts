import { describe, it, expect } from "vitest";
import {
  assertScheduleLeadTime,
  assertEnrollmentOpen,
  assertBackoutOpen,
  isEnrollmentOpen,
  isBackoutOpen,
  isInFillWindow,
  LIVE_CLASS_MIN_SCHEDULE_AHEAD_MS,
  LIVE_CLASS_ENROLLMENT_CUTOFF_MS,
  LIVE_CLASS_BACKOUT_CUTOFF_MS,
  LIVE_CLASS_FILL_WINDOW_MS,
  getEnrollmentDeadlineIso,
  getBackoutDeadlineIso,
  qualifiesForPatienceRun,
} from "../lib/live-class-scheduling-policy";

describe("live class scheduling policy", () => {
  const startsAt = "2026-08-01T14:00:00.000Z";

  it("requires 12 hours lead time when scheduling", () => {
    const now = Date.parse("2026-08-01T12:00:00.000Z");
    const tooSoon = new Date(now + LIVE_CLASS_MIN_SCHEDULE_AHEAD_MS - 60_000).toISOString();
    expect(() => assertScheduleLeadTime(tooSoon, now)).toThrow(/12 hours/);
    const ok = new Date(now + LIVE_CLASS_MIN_SCHEDULE_AHEAD_MS).toISOString();
    expect(() => assertScheduleLeadTime(ok, now)).not.toThrow();
  });

  it("closes back-out 1 hour 30 minutes before start", () => {
    expect(getBackoutDeadlineIso(startsAt)).toBe("2026-08-01T12:30:00.000Z");
    expect(isBackoutOpen(startsAt, Date.parse("2026-08-01T12:29:59.000Z"))).toBe(true);
    expect(isBackoutOpen(startsAt, Date.parse("2026-08-01T12:30:00.000Z"))).toBe(false);
    expect(() => assertBackoutOpen(startsAt, Date.parse("2026-08-01T12:30:00.000Z"))).toThrow(
      /1 hour 30 minutes/,
    );
  });

  it("has a 30-minute fill window before sign-ups close", () => {
    expect(LIVE_CLASS_FILL_WINDOW_MS).toBe(30 * 60 * 1000);
    expect(getEnrollmentDeadlineIso(startsAt)).toBe("2026-08-01T13:00:00.000Z");
    expect(isInFillWindow(startsAt, Date.parse("2026-08-01T12:29:59.000Z"))).toBe(false);
    expect(isInFillWindow(startsAt, Date.parse("2026-08-01T12:30:00.000Z"))).toBe(true);
    expect(isInFillWindow(startsAt, Date.parse("2026-08-01T12:59:59.000Z"))).toBe(true);
    expect(isInFillWindow(startsAt, Date.parse("2026-08-01T13:00:00.000Z"))).toBe(false);
    expect(isEnrollmentOpen(startsAt, Date.parse("2026-08-01T12:45:00.000Z"))).toBe(true);
    expect(isBackoutOpen(startsAt, Date.parse("2026-08-01T12:45:00.000Z"))).toBe(false);
  });

  it("closes enrollment 1 hour before start", () => {
    expect(LIVE_CLASS_ENROLLMENT_CUTOFF_MS).toBe(60 * 60 * 1000);
    expect(LIVE_CLASS_BACKOUT_CUTOFF_MS).toBe(90 * 60 * 1000);
    expect(isEnrollmentOpen(startsAt, Date.parse("2026-08-01T12:59:59.000Z"))).toBe(true);
    expect(isEnrollmentOpen(startsAt, Date.parse("2026-08-01T13:00:00.000Z"))).toBe(false);
    expect(() => assertEnrollmentOpen(startsAt, Date.parse("2026-08-01T13:00:00.000Z"))).toThrow(
      /1 hour before/,
    );
  });

  it("allows patience run when 25th seat opened and fill window ended", () => {
    expect(
      qualifiesForPatienceRun({
        refundsOnUnderfill: true,
        ticketOnlyMinimum: true,
        minAttendeesToStart: 25,
        peakPaidCount: 25,
        currentPaidCount: 24,
        startsAt,
        nowMs: Date.parse("2026-08-01T13:00:00.000Z"),
      }),
    ).toBe(true);
    expect(
      qualifiesForPatienceRun({
        refundsOnUnderfill: true,
        ticketOnlyMinimum: true,
        minAttendeesToStart: 25,
        peakPaidCount: 24,
        currentPaidCount: 24,
        startsAt,
        nowMs: Date.parse("2026-08-01T13:00:00.000Z"),
      }),
    ).toBe(false);
  });
});
