import { describe, expect, it, beforeEach } from "vitest";
import {
  clampClassReplayPriceCents,
  defaultClassReplayPriceCents,
  isSafeReplayVideoUrl,
} from "../lib/class-replay-policy";
import { setAiSessionProgram } from "../server/_core/ai-session-programming";
import {
  scheduleLiveSession,
  _forceSessionEndedForTests,
} from "../server/_core/ai-live-session-service";
import { LIVE_CLASS_MIN_SCHEDULE_AHEAD_MS } from "../lib/live-class-scheduling-policy";
import {
  publishClassReplay,
  getReplayWatchAccess,
  userHasReplayAccess,
  _resetClassReplaysForTests,
} from "../server/_core/class-replay-service";

function futureStart(): string {
  return new Date(Date.now() + LIVE_CLASS_MIN_SCHEDULE_AHEAD_MS + 60 * 60 * 1000).toISOString();
}

describe("class replay policy", () => {
  it("clamps paid replay prices and allows free", () => {
    expect(clampClassReplayPriceCents(0)).toBe(0);
    expect(clampClassReplayPriceCents(50)).toBe(99);
    expect(clampClassReplayPriceCents(499)).toBe(499);
    expect(defaultClassReplayPriceCents(2000)).toBe(1000);
  });

  it("only allows https video links", () => {
    expect(isSafeReplayVideoUrl("")).toBe(true);
    expect(isSafeReplayVideoUrl("https://cdn.example.com/class.mp4")).toBe(true);
    expect(isSafeReplayVideoUrl("http://insecure.example.com/x")).toBe(false);
    expect(isSafeReplayVideoUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("class replay publish and watch", () => {
  const creatorAiId = "ai-coder-001";

  beforeEach(() => {
    _resetClassReplaysForTests();
    setAiSessionProgram({
      creatorAiId,
      enabled: true,
      durationMinutes: 30,
      priceCentsPerMinute: 20,
      maxAttendees: 100,
    });
  });

  it("lets the host publish after the class ends", () => {
    const session = scheduleLiveSession({
      creatorAiId,
      startsAt: futureStart(),
      hostUserId: "creator-1",
    });
    expect(() =>
      publishClassReplay({
        sessionId: session.id,
        userId: "creator-1",
        isPlatformOwner: false,
        priceCents: 299,
      }),
    ).toThrow(/after the live class ends/);

    _forceSessionEndedForTests(session.id);
    const replay = publishClassReplay({
      sessionId: session.id,
      userId: "creator-1",
      isPlatformOwner: false,
      priceCents: 299,
    });
    expect(replay.published).toBe(true);
    expect(replay.priceCents).toBe(299);
    expect(replay.hostUserId).toBe("creator-1");
  });

  it("blocks a stranger from publishing someone else's class", () => {
    const session = scheduleLiveSession({
      creatorAiId,
      startsAt: futureStart(),
      hostUserId: "creator-1",
    });
    _forceSessionEndedForTests(session.id);
    expect(() =>
      publishClassReplay({
        sessionId: session.id,
        userId: "stranger",
        isPlatformOwner: false,
        priceCents: 199,
      }),
    ).toThrow(/host or the platform owner/);
  });

  it("lets the owner publish an AI class with no human host", () => {
    const session = scheduleLiveSession({
      creatorAiId,
      startsAt: futureStart(),
    });
    _forceSessionEndedForTests(session.id);
    const replay = publishClassReplay({
      sessionId: session.id,
      userId: "owner-1",
      isPlatformOwner: true,
      priceCents: 499,
      videoUrl: "https://cdn.example.com/ai-class.mp4",
    });
    expect(replay.videoUrl).toContain("https://");
    const watch = getReplayWatchAccess({
      replayId: replay.id,
      userId: "owner-1",
      isPlatformOwner: true,
    });
    expect(watch.allowed).toBe(true);
    expect(userHasReplayAccess({ replayId: replay.id, userId: "member", isPlatformOwner: false })).toBe(
      false,
    );
  });
});
