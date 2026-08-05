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
} from "../server/_core/ai-live-session-service";
import {
  getVideoGenerationStatus,
  requestCreatorVideo,
} from "../server/_core/ai-creator-video-service";

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

  it("schedules, sells tickets, and enforces commitment window", async () => {
    setAiSessionProgram({ creatorAiId, durationMinutes: 30, priceCentsPerMinute: 20 });
    const startsAt = new Date(Date.now() + 5 * 60_000).toISOString();
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
    });
    if (checkout.mode === "checkout") {
      await confirmSessionPayment({
        paymentIntentId: checkout.paymentIntentId,
        userId: "user-2",
        userEmail: "buyer@example.com",
      });
    }
    expect(listLiveSessions({ creatorAiId }).length).toBe(1);
  });

  it("blocks cancel during committed live window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T18:00:00.000Z"));
    const startsAt = new Date("2026-08-01T18:00:00.000Z").toISOString();
    const session = scheduleLiveSession({ creatorAiId, startsAt, durationMinutes: 30 });
    vi.setSystemTime(new Date("2026-08-01T18:10:00.000Z"));
    expect(() => cancelLiveSession(session.id)).toThrow(/full 30 minutes/);
    vi.useRealTimers();
  });

  it("allows overtime extension when enabled", () => {
    const startsAt = new Date(Date.now() + 60_000).toISOString();
    const session = scheduleLiveSession({ creatorAiId, startsAt, durationMinutes: 15 });
    const extended = extendLiveSessionOvertime({ sessionId: session.id, additionalMinutes: 15 });
    expect(extended.overtimeMinutes).toBe(15);
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
