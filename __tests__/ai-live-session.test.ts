import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getAiSessionProgram,
  setAiSessionProgram,
  listAiSessionPrograms,
  buildSessionHostSystemPrompt,
  computeSessionTicketCents,
  CREATOR_MIN_PRICE_CENTS_PER_MINUTE,
  MAX_SESSION_ATTENDEES,
  assertAllowedSessionDuration,
} from "../server/_core/ai-session-programming";
import {
  scheduleLiveSession,
  createSessionCheckout,
  confirmSessionPayment,
  getSessionJoinAccess,
  listLiveSessions,
  cancelLiveSession,
  extendLiveSessionOvertime,
  expressInterestInSession,
  getSessionEnrollmentSummary,
  getLiveSession,
  backOutOfLiveSession,
  refundAllSessionTickets,
  getPaidTicketCount,
} from "../server/_core/ai-live-session-service";
import {
  getVideoGenerationStatus,
  requestCreatorVideo,
} from "../server/_core/ai-creator-video-service";
import { LIVE_CLASS_MIN_SCHEDULE_AHEAD_MS } from "../lib/live-class-scheduling-policy";

function futureStart(hoursFromNow = 14): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

describe("AI live session programming", () => {
  const creatorAiId = "ai-coder-001";

  beforeEach(() => {
    setAiSessionProgram({
      creatorAiId,
      enabled: true,
      durationMinutes: 60,
      priceCentsPerMinute: 50,
      maxAttendees: 5_000,
      allowOvertime: true,
      hostScript: "Run a committed 60-minute coding masterclass.",
    });
  });

  it("defaults with creator min $0.20/min and 5k seats", () => {
    const program = getAiSessionProgram("ai-game-dev-001");
    expect(program.priceCentsPerMinute).toBe(CREATOR_MIN_PRICE_CENTS_PER_MINUTE);
    expect(program.maxAttendees).toBe(5_000);
    expect(computeSessionTicketCents(60, program.priceCentsPerMinute)).toBe(1200);
  });

  it("only allows 15, 30, 45, or 60 minute classes", () => {
    expect(assertAllowedSessionDuration(30)).toBe(30);
    expect(() => setAiSessionProgram({ creatorAiId, durationMinutes: 20 })).toThrow(
      /15, 30, 45, or 60/,
    );
  });

  it("rejects explicit rates below the twenty-cent floor", () => {
    expect(() => setAiSessionProgram({ creatorAiId, priceCentsPerMinute: 15 })).toThrow(
      /floor/,
    );
    const program = setAiSessionProgram({ creatorAiId, priceCentsPerMinute: 100 });
    expect(program.priceCentsPerMinute).toBe(100);
  });

  it("allows premium rates like $5 per minute", () => {
    const program = setAiSessionProgram({ creatorAiId, priceCentsPerMinute: 500 });
    expect(program.priceCentsPerMinute).toBe(500);
    expect(computeSessionTicketCents(60, 500)).toBe(30_000);
    expect(computeSessionTicketCents(30, 500)).toBe(15_000);
  });

  it("allows up to 10,000 attendees", () => {
    const program = setAiSessionProgram({ creatorAiId, maxAttendees: 10_000 });
    expect(program.maxAttendees).toBe(MAX_SESSION_ATTENDEES);
  });

  it("host prompt includes full commitment language", () => {
    setAiSessionProgram({ creatorAiId, durationMinutes: 45 });
    const prompt = buildSessionHostSystemPrompt(creatorAiId, "Live React Hour");
    expect(prompt).toContain("45 minutes");
    expect(prompt).toContain("COMMITTED DURATION");
  });

  it("rejects scheduling less than 12 hours ahead", () => {
    const tooSoon = new Date(Date.now() + LIVE_CLASS_MIN_SCHEDULE_AHEAD_MS - 60_000).toISOString();
    expect(() => scheduleLiveSession({ creatorAiId, startsAt: tooSoon })).toThrow(/12 hours/);
  });

  it("schedules, sells tickets, and enforces commitment window", async () => {
    setAiSessionProgram({ creatorAiId, durationMinutes: 30, priceCentsPerMinute: 20 });
    const startsAt = futureStart(14);
    const session = scheduleLiveSession({ creatorAiId, startsAt });
    expect(session.committedDurationMinutes).toBe(30);
    expect(session.priceCents).toBe(600);

    const access = getSessionJoinAccess({
      sessionId: session.id,
      userId: "user-1",
      isPlatformOwner: true,
    });
    expect(access.commitment?.committedDurationMinutes).toBe(30);

    const checkout = await createSessionCheckout({
      sessionId: session.id,
      userId: "user-2",
      userEmail: "buyer@example.com",
      userName: "Buyer",
      isPlatformOwner: false,
      billingStateCode: "FL",
    });
    if (checkout.mode === "checkout") {
      expect(checkout.amountCents).toBeGreaterThan(session.priceCents);
      await confirmSessionPayment({
        paymentIntentId: checkout.paymentIntentId,
        userId: "user-2",
        userEmail: "buyer@example.com",
      });
    }
    expect(listLiveSessions({ creatorAiId }).length).toBe(1);
  });

  it("blocks ticket purchase within 1 hour of start", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
    const startsAt = new Date("2026-08-01T14:00:00.000Z").toISOString();
    const session = scheduleLiveSession({ creatorAiId, startsAt, priceCentsPerMinute: 20 });

    vi.setSystemTime(new Date("2026-08-01T13:00:00.000Z"));
    await expect(
      createSessionCheckout({
        sessionId: session.id,
        userId: "late-buyer",
        userEmail: "late@test.com",
        userName: "Late",
        isPlatformOwner: false,
        billingStateCode: "FL",
      }),
    ).rejects.toThrow(/closed/i);

    vi.useRealTimers();
  });

  it("blocks cancel during committed live window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
    const startsAt = new Date("2026-08-01T18:00:00.000Z").toISOString();
    const session = scheduleLiveSession({ creatorAiId, startsAt, durationMinutes: 30 });
    vi.setSystemTime(new Date("2026-08-01T18:10:00.000Z"));
    expect(() => cancelLiveSession(session.id)).toThrow(/full 30 minutes/);
    vi.useRealTimers();
  });

  it("allows overtime extension when enabled", () => {
    const startsAt = futureStart(14);
    const session = scheduleLiveSession({ creatorAiId, startsAt, durationMinutes: 15 });
    const extended = extendLiveSessionOvertime({ sessionId: session.id, additionalMinutes: 15 });
    expect(extended.overtimeMinutes).toBe(15);
  });

  it("tracks registration toward minimum and cancels if not met at start", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
    const startsAt = new Date("2026-08-01T14:00:00.000Z").toISOString();
    const session = scheduleLiveSession({
      creatorAiId,
      startsAt,
      title: "Beginner Electrician Class",
      minAttendeesToStart: 5,
      maxAttendees: 50,
    });

    expressInterestInSession({ sessionId: session.id, userId: "u1" });
    expressInterestInSession({ sessionId: session.id, userId: "u2" });
    expressInterestInSession({ sessionId: session.id, userId: "u3" });

    let summary = getSessionEnrollmentSummary(getLiveSession(session.id)!);
    expect(summary.registeredCount).toBe(3);
    expect(summary.spotsNeeded).toBe(2);
    expect(summary.enrollmentOpen).toBe(true);

    vi.setSystemTime(new Date("2026-08-01T14:00:00.000Z"));
    const afterStart = getLiveSession(session.id)!;
    expect(afterStart.enrollmentStatus).toBe("cancelled_insufficient");
    expect(afterStart.status).toBe("cancelled");

    vi.useRealTimers();
  });

  it("confirms class when minimum registrations are met before start", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
    const startsAt = new Date("2026-08-01T14:00:00.000Z").toISOString();
    const session = scheduleLiveSession({
      creatorAiId,
      startsAt,
      minAttendeesToStart: 5,
    });

    for (let i = 1; i <= 5; i += 1) {
      expressInterestInSession({ sessionId: session.id, userId: `user-${i}` });
    }

    const beforeStart = getLiveSession(session.id)!;
    expect(getSessionEnrollmentSummary(beforeStart).confirmedToRun).toBe(true);

    vi.setSystemTime(new Date("2026-08-01T14:00:00.000Z"));
    const atStart = getLiveSession(session.id)!;
    expect(atStart.enrollmentStatus).toBe("confirmed");
    expect(atStart.status).toBe("live");

    vi.useRealTimers();
  });

  it("refunds paid tickets when group appointment minimum is not met 1 hour before start", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
    const startsAt = new Date("2026-08-01T14:00:00.000Z").toISOString();
    const session = scheduleLiveSession({
      creatorAiId,
      startsAt,
      title: "Electrician Group Class",
      pricingTier: "group_appointment",
      minAttendeesToStart: 25,
      priceCentsPerMinute: 1,
      durationMinutes: 60,
    });
    expect(session.priceCentsPerMinute).toBe(1);
    expect(session.priceCents).toBe(60);
    expect(session.refundsOnUnderfill).toBe(true);

    for (let i = 1; i <= 24; i += 1) {
      const checkout = await createSessionCheckout({
        sessionId: session.id,
        userId: `buyer-${i}`,
        userEmail: `buyer${i}@test.com`,
        userName: `Buyer ${i}`,
        isPlatformOwner: false,
        billingStateCode: "FL",
      });
      if (checkout.mode === "checkout") {
        await confirmSessionPayment({
          paymentIntentId: checkout.paymentIntentId,
          userId: `buyer-${i}`,
          userEmail: `buyer${i}@test.com`,
        });
      }
    }

    expect(getPaidTicketCount(session.id)).toBe(24);
    expect(() =>
      expressInterestInSession({ sessionId: session.id, userId: "free-rsvp" }),
    ).toThrow(/paid ticket/);

    vi.setSystemTime(new Date("2026-08-01T13:00:00.000Z"));
    getLiveSession(session.id);
    const refunds = await refundAllSessionTickets(session.id);
    expect(refunds.refundedCount).toBe(24);
    expect(refunds.totalCents).toBeGreaterThan(24 * 60);

    const after = getLiveSession(session.id)!;
    expect(after.enrollmentStatus).toBe("cancelled_insufficient");
    expect(after.refundsProcessed).toBe(true);

    vi.useRealTimers();
  });

  it("does not refund tickets after payment unless class cancelled for insufficient group signups", async () => {
    const startsAt = futureStart(14);
    const session = scheduleLiveSession({
      creatorAiId,
      startsAt,
      priceCentsPerMinute: 20,
      durationMinutes: 30,
    });

    const checkout = await createSessionCheckout({
      sessionId: session.id,
      userId: "buyer-1",
      userEmail: "buyer1@test.com",
      userName: "Buyer",
      isPlatformOwner: false,
      billingStateCode: "FL",
    });
    if (checkout.mode === "checkout") {
      await confirmSessionPayment({
        paymentIntentId: checkout.paymentIntentId,
        userId: "buyer-1",
        userEmail: "buyer1@test.com",
      });
    }

    const blocked = await refundAllSessionTickets(session.id);
    expect(blocked.refundedCount).toBe(0);
    expect(blocked.totalCents).toBe(0);
  });

  it("allows voluntary back-out with refund before seat lock, then blocks back-out in fill window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
    const startsAt = new Date("2026-08-01T14:00:00.000Z").toISOString();
    const session = scheduleLiveSession({
      creatorAiId,
      startsAt,
      pricingTier: "group_appointment",
      minAttendeesToStart: 25,
      priceCentsPerMinute: 1,
      durationMinutes: 60,
    });

    const checkout = await createSessionCheckout({
      sessionId: session.id,
      userId: "buyer-backout",
      userEmail: "backout@test.com",
      userName: "Backout",
      isPlatformOwner: false,
      billingStateCode: "FL",
    });
    if (checkout.mode === "checkout") {
      await confirmSessionPayment({
        paymentIntentId: checkout.paymentIntentId,
        userId: "buyer-backout",
        userEmail: "backout@test.com",
      });
    }
    expect(getPaidTicketCount(session.id)).toBe(1);

    vi.setSystemTime(new Date("2026-08-01T12:00:00.000Z"));
    const result = await backOutOfLiveSession({
      sessionId: session.id,
      userId: "buyer-backout",
      userEmail: "backout@test.com",
    });
    expect(result.refunded).toBe(true);
    expect(getPaidTicketCount(session.id)).toBe(0);

    vi.setSystemTime(new Date("2026-08-01T12:35:00.000Z"));
    const checkout2 = await createSessionCheckout({
      sessionId: session.id,
      userId: "buyer-fill",
      userEmail: "fill@test.com",
      userName: "Fill",
      isPlatformOwner: false,
      billingStateCode: "FL",
    });
    expect(checkout2.mode).toBe("checkout");
    if (checkout2.mode === "checkout") {
      await confirmSessionPayment({
        paymentIntentId: checkout2.paymentIntentId,
        userId: "buyer-fill",
        userEmail: "fill@test.com",
      });
    }

    vi.setSystemTime(new Date("2026-08-01T12:45:00.000Z"));
    await expect(
      backOutOfLiveSession({
        sessionId: session.id,
        userId: "buyer-fill",
        userEmail: "fill@test.com",
      }),
    ).rejects.toThrow(/Back-out closed|1 hour 30 minutes/i);

    vi.useRealTimers();
  });

  it("confirms group class for 24 patient attendees when 25th paid seat opened", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
    const startsAt = new Date("2026-08-01T14:00:00.000Z").toISOString();
    const session = scheduleLiveSession({
      creatorAiId,
      startsAt,
      pricingTier: "group_appointment",
      minAttendeesToStart: 25,
      priceCentsPerMinute: 1,
      durationMinutes: 60,
    });

    for (let i = 1; i <= 25; i += 1) {
      const checkout = await createSessionCheckout({
        sessionId: session.id,
        userId: `buyer-${i}`,
        userEmail: `buyer${i}@test.com`,
        userName: `Buyer ${i}`,
        isPlatformOwner: false,
        billingStateCode: "FL",
      });
      if (checkout.mode === "checkout") {
        await confirmSessionPayment({
          paymentIntentId: checkout.paymentIntentId,
          userId: `buyer-${i}`,
          userEmail: `buyer${i}@test.com`,
        });
      }
    }
    expect(getPaidTicketCount(session.id)).toBe(25);

    vi.setSystemTime(new Date("2026-08-01T12:00:00.000Z"));
    await backOutOfLiveSession({
      sessionId: session.id,
      userId: "buyer-25",
      userEmail: "buyer25@test.com",
    });
    expect(getPaidTicketCount(session.id)).toBe(24);

    vi.setSystemTime(new Date("2026-08-01T12:45:00.000Z"));
    let pending = getLiveSession(session.id)!;
    expect(getSessionEnrollmentSummary(pending).patienceGracePending).toBe(true);

    vi.setSystemTime(new Date("2026-08-01T13:00:00.000Z"));
    const atCheck = getLiveSession(session.id)!;
    expect(atCheck.enrollmentStatus).toBe("confirmed");
    expect(atCheck.status).toBe("scheduled");
    expect(getSessionEnrollmentSummary(atCheck).patienceGraceActive).toBe(true);

    const refunds = await refundAllSessionTickets(session.id);
    expect(refunds.refundedCount).toBe(0);

    vi.useRealTimers();
  });

  it("cancels group class when minimum never met even with 24 paid", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
    const startsAt = new Date("2026-08-01T14:00:00.000Z").toISOString();
    const session = scheduleLiveSession({
      creatorAiId,
      startsAt,
      pricingTier: "group_appointment",
      minAttendeesToStart: 25,
      priceCentsPerMinute: 1,
      durationMinutes: 60,
    });

    for (let i = 1; i <= 24; i += 1) {
      const checkout = await createSessionCheckout({
        sessionId: session.id,
        userId: `buyer-${i}`,
        userEmail: `buyer${i}@test.com`,
        userName: `Buyer ${i}`,
        isPlatformOwner: false,
        billingStateCode: "FL",
      });
      if (checkout.mode === "checkout") {
        await confirmSessionPayment({
          paymentIntentId: checkout.paymentIntentId,
          userId: `buyer-${i}`,
          userEmail: `buyer${i}@test.com`,
        });
      }
    }

    vi.setSystemTime(new Date("2026-08-01T13:00:00.000Z"));
    const atCheck = getLiveSession(session.id)!;
    expect(atCheck.enrollmentStatus).toBe("cancelled_insufficient");

    vi.useRealTimers();
  });
});

describe("AI creator video generation", () => {
  it("stays locked until revenue threshold", () => {
    const status = getVideoGenerationStatus();
    expect(status.unlocked).toBe(false);
    expect(status.thresholdCents).toBeGreaterThan(0);
  });

  it("generates video when unlocked", () => {
    process.env.PLATFORM_VIDEO_GEN_MIN_REVENUE_CENTS = "0";
    const job = requestCreatorVideo({
      creatorAiId: "ai-coder-001",
      topic: "5 tips to land your first dev job",
    });
    expect(job.status).toBe("ready");
    expect(job.shareCaption).toContain("follow");
    delete process.env.PLATFORM_VIDEO_GEN_MIN_REVENUE_CENTS;
  });
});
