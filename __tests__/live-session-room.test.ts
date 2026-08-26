import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getLiveSessionRoomPhase,
  buildOvertimeNotice,
  OVERTIME_WARNING_MINUTES_BEFORE_END,
} from "../lib/live-session-room-policy";
import {
  scheduleLiveSession,
  createSessionCheckout,
  confirmSessionPayment,
  getLiveSession,
} from "../server/_core/ai-live-session-service";
import {
  getLiveSessionRoomState,
  submitLiveSessionQuestion,
  optIntoLiveSessionOvertime,
  leaveLiveSessionRoom,
  markLiveSessionQuestionAnswered,
  _resetLiveSessionRoomStoreForTests,
} from "../server/_core/live-session-room-service";
import { setAiSessionProgram } from "../server/_core/ai-session-programming";
import { purchaseAiTalkPack } from "../server/_core/ai-premium-media-service";

describe("live session room policy", () => {
  it("shows overtime warning 2 minutes before committed end", () => {
    const startsAt = new Date(Date.now() - 58 * 60_000).toISOString();
    const phase = getLiveSessionRoomPhase({
      startsAt,
      committedDurationMinutes: 60,
      overtimeMinutes: 30,
      allowOvertime: true,
    });
    expect(phase.phase).toBe("overtime_warning");
    expect(phase.showOvertimeNotice).toBe(true);
    expect(phase.committedMinutesRemaining).toBe(2);
    expect(OVERTIME_WARNING_MINUTES_BEFORE_END).toBe(2);
  });

  it("builds overtime notice with ticket rate", () => {
    const notice = buildOvertimeNotice({
      priceCentsPerMinute: 50,
      committedDurationMinutes: 60,
    });
    expect(notice).toContain("58 minutes");
    expect(notice).toContain("$0.50/min");
    expect(notice).toContain("pay-as-you-go");
  });
});

describe("live session room service", () => {
  const creatorAiId = "ai-coder-001";
  const userA = "user-a";
  const userB = "user-b";
  const userC = "user-c-no-speak";

  beforeEach(() => {
    _resetLiveSessionRoomStoreForTests();
    setAiSessionProgram({
      creatorAiId,
      enabled: true,
      durationMinutes: 60,
      priceCentsPerMinute: 50,
      allowOvertime: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function setupLiveSessionAt(startIso: string, nowIso: string) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(nowIso));
    const session = scheduleLiveSession({ creatorAiId, startsAt: startIso });
    const checkoutA = await createSessionCheckout({
      sessionId: session.id,
      userId: userA,
      userEmail: "a@test.com",
      userName: "User A",
      isPlatformOwner: false,
      billingStateCode: "FL",
    });
    if (checkoutA.mode === "checkout") {
      await confirmSessionPayment({
        paymentIntentId: checkoutA.paymentIntentId,
        userId: userA,
        userEmail: "a@test.com",
      });
    }
    const checkoutB = await createSessionCheckout({
      sessionId: session.id,
      userId: userB,
      userEmail: "b@test.com",
      userName: "User B",
      isPlatformOwner: false,
      billingStateCode: "FL",
    });
    if (checkoutB.mode === "checkout") {
      await confirmSessionPayment({
        paymentIntentId: checkoutB.paymentIntentId,
        userId: userB,
        userEmail: "b@test.com",
      });
    }
    return getLiveSession(session.id)!;
  }

  it("orders voice questions before text questions", async () => {
    const session = await setupLiveSessionAt(
      "2026-08-01T14:00:00.000Z",
      "2026-08-01T00:00:00.000Z",
    );
    vi.setSystemTime(new Date("2026-08-01T14:05:00.000Z"));

    purchaseAiTalkPack({
      userId: userA,
      userEmail: "a@test.com",
      packId: "talk_5",
      billingStateCode: "FL",
    });

    submitLiveSessionQuestion({
      sessionId: session.id,
      userId: userB,
      userLabel: "User B",
      isPlatformOwner: false,
      channel: "text",
      questionText: "Text question first in time",
    });
    submitLiveSessionQuestion({
      sessionId: session.id,
      userId: userA,
      userLabel: "User A",
      isPlatformOwner: false,
      channel: "voice",
      questionText: "Voice question second in time",
    });

    const state = getLiveSessionRoomState({
      sessionId: session.id,
      userId: userA,
      userLabel: "User A",
      isPlatformOwner: false,
    });

    expect(state.queue[0]?.channel).toBe("voice");
    expect(state.queue[1]?.channel).toBe("text");
    expect(state.queue[0]?.status).toBe("active");
  });

  it("requires speak access for voice questions", async () => {
    const session = await setupLiveSessionAt(
      "2026-08-02T14:00:00.000Z",
      "2026-08-02T00:00:00.000Z",
    );
    const checkoutC = await createSessionCheckout({
      sessionId: session.id,
      userId: userC,
      userEmail: "c@test.com",
      userName: "User C",
      isPlatformOwner: false,
      billingStateCode: "FL",
    });
    if (checkoutC.mode === "checkout") {
      await confirmSessionPayment({
        paymentIntentId: checkoutC.paymentIntentId,
        userId: userC,
        userEmail: "c@test.com",
      });
    }
    vi.setSystemTime(new Date("2026-08-02T14:05:00.000Z"));

    expect(() =>
      submitLiveSessionQuestion({
        sessionId: session.id,
        userId: userC,
        userLabel: "User C",
        isPlatformOwner: false,
        channel: "voice",
        questionText: "Can I speak?",
      }),
    ).toThrow(/talk time/);
  });

  it("supports overtime opt-in and leave", async () => {
    const session = await setupLiveSessionAt(
      "2026-08-03T14:00:00.000Z",
      "2026-08-03T00:00:00.000Z",
    );
    vi.setSystemTime(new Date("2026-08-03T14:58:00.000Z"));

    const before = getLiveSessionRoomState({
      sessionId: session.id,
      userId: userA,
      userLabel: "User A",
      isPlatformOwner: false,
    });
    expect(before.showOvertimeNotice).toBe(true);

    const opt = optIntoLiveSessionOvertime({
      sessionId: session.id,
      userId: userA,
      isPlatformOwner: false,
    });
    expect(opt.message).toContain("pay-as-you-go");

    vi.setSystemTime(new Date("2026-08-03T15:05:00.000Z"));

    submitLiveSessionQuestion({
      sessionId: session.id,
      userId: userA,
      userLabel: "User A",
      isPlatformOwner: false,
      channel: "text",
      questionText: "Overtime question here",
    });

    const q = getLiveSessionRoomState({
      sessionId: session.id,
      userId: userA,
      userLabel: "User A",
      isPlatformOwner: false,
    });
    const active = q.myQuestions.find((item) => item.status === "active");
    expect(active).toBeTruthy();

    markLiveSessionQuestionAnswered({
      sessionId: session.id,
      userId: userA,
      questionId: active!.id,
      isPlatformOwner: false,
    });

    const leaveResult = leaveLiveSessionRoom({
      sessionId: session.id,
      userId: userA,
      isPlatformOwner: false,
    });
    expect(leaveResult.ok).toBe(true);
  });
});
