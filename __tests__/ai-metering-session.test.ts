import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTalkTimeLot, getTalkMillisecondsRemaining, _clearTalkTimeForTests } from "../server/_core/ai-talk-time-tracker";
import {
  startMeterSession,
  heartbeatMeterSession,
  pauseMeterSession,
  resumeMeterSession,
  finalizeMeterSession,
  _clearMeterSessionsForTests,
  getOpenMeterSession,
} from "../server/_core/ai-metering-session-service";
import { METER_DISCONNECT_PAUSE_THRESHOLD_MS } from "../lib/ai-metering-policy";

describe("ai-metering-session-service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-07T12:00:00.000Z"));
    _clearTalkTimeForTests();
    _clearMeterSessionsForTests();
    createTalkTimeLot({ userId: "u1", packId: "talk_1", priceCents: 100 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not deduct talk time until finalize", () => {
    const session = startMeterSession({
      userId: "u1",
      creatorId: "ai-wellness-001",
      kind: "voice_playback",
      maxBillableMs: 60_000,
    });
    vi.advanceTimersByTime(10_000);
    heartbeatMeterSession({
      sessionId: session.id,
      userId: "u1",
      playbackPositionMs: 10_000,
      clientOnline: true,
    });
    expect(getTalkMillisecondsRemaining("u1")).toBe(300_000);
    const result = finalizeMeterSession({
      sessionId: session.id,
      userId: "u1",
      playbackPositionMs: 10_000,
    });
    expect(result.billedMs).toBeGreaterThan(0);
    expect(getTalkMillisecondsRemaining("u1")).toBeLessThan(300_000);
  });

  it("pauses billing on disconnect without losing balance", () => {
    const session = startMeterSession({
      userId: "u1",
      creatorId: "ai-wellness-001",
      kind: "voice_playback",
      maxBillableMs: 270_320,
    });
    heartbeatMeterSession({
      sessionId: session.id,
      userId: "u1",
      playbackPositionMs: 29_680,
      clientOnline: true,
    });
    const before = getTalkMillisecondsRemaining("u1");
    pauseMeterSession({
      sessionId: session.id,
      userId: "u1",
      playbackPositionMs: 29_680,
      reason: "disconnect",
    });
    expect(getTalkMillisecondsRemaining("u1")).toBe(before);

    resumeMeterSession({
      sessionId: session.id,
      userId: "u1",
      playbackPositionMs: 29_680,
    });
    expect(getTalkMillisecondsRemaining("u1")).toBe(before);
  });

  it("auto-pauses when heartbeat stops (simulated disconnect)", () => {
    startMeterSession({
      userId: "u1",
      creatorId: "ai-wellness-001",
      kind: "voice_playback",
      maxBillableMs: 60_000,
    });
    vi.advanceTimersByTime(METER_DISCONNECT_PAUSE_THRESHOLD_MS + 2_000);
    const open = getOpenMeterSession("u1");
    expect(open?.status).toBe("paused");
    expect(open?.pauseReason).toBe("disconnect");
  });
});
