import { describe, it, expect, beforeEach } from "vitest";
import {
  HOURGLASS_LESSON_MINUTES,
  listHourglassTradeLessons,
} from "../lib/ai-hour-lesson-catalog";
import {
  generateHourLessonVideo,
  publishHourLessonHourglass,
} from "../server/_core/ai-hour-lesson-service";
import {
  getVideoGenerationStatus,
  requestCreatorVideo,
  _resetCreatorVideosForTests,
} from "../server/_core/ai-creator-video-service";
import { getAiSessionProgram, listAiSessionPrograms } from "../server/_core/ai-session-programming";
import { getLiveSession, getSessionJoinAccess } from "../server/_core/ai-live-session-service";

function futureStart(hoursFromNow = 14): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

describe("AI hourglass lesson videos", () => {
  beforeEach(() => {
    _resetCreatorVideosForTests();
    delete process.env.PLATFORM_VIDEO_GEN_MIN_REVENUE_CENTS;
  });

  it("enables electrician, HVAC, welding, and plumbing to host hourglasses by default", () => {
    for (const id of [
      "ai-electrician-001",
      "ai-hvac-001",
      "ai-welder-001",
      "ai-plumber-001",
    ]) {
      const program = getAiSessionProgram(id);
      expect(program.enabled).toBe(true);
      expect(program.durationMinutes).toBe(60);
    }
    const ready = listAiSessionPrograms({ enabledOnly: true }).map((p) => p.creatorAiId);
    expect(ready).toEqual(
      expect.arrayContaining([
        "ai-electrician-001",
        "ai-hvac-001",
        "ai-welder-001",
        "ai-plumber-001",
      ]),
    );
  });

  it("lists beginner electrician, HVAC, welding, and plumbing hours", () => {
    const lessons = listHourglassTradeLessons();
    expect(lessons.map((l) => l.id).sort()).toEqual([
      "electrician-beginner",
      "hvac-beginner",
      "plumber-beginner",
      "welder-beginner",
    ]);
    expect(lessons.every((l) => l.level === "beginner")).toBe(true);
    expect(lessons.every((l) => l.segments[0]?.minuteStart === 0)).toBe(true);
    expect(lessons.every((l) => l.segments.at(-1)?.minuteEnd === HOURGLASS_LESSON_MINUTES)).toBe(
      true,
    );
  });

  it("lets an AI assemble an hourglass lesson without waiting on promo-clip revenue", () => {
    expect(getVideoGenerationStatus().unlocked).toBe(false);
    expect(getVideoGenerationStatus().hourLessonsUnlocked).toBe(true);
    expect(() =>
      requestCreatorVideo({
        creatorAiId: "ai-electrician-001",
        topic: "promo teaser",
      }),
    ).toThrow(/unlock/i);

    const { lesson, video } = generateHourLessonVideo({
      creatorAiId: "ai-electrician-001",
      catalogId: "electrician-beginner",
    });
    expect(lesson.title).toMatch(/electrician/i);
    expect(video.purpose).toBe("hourglass");
    expect(video.style).toBe("hour_lesson");
    expect(video.durationMinutes).toBe(60);
    expect(video.status).toBe("ready");
    expect(video.lessonSegments?.length).toBeGreaterThanOrEqual(5);
  });

  it("publishes a billed hourglass the AI hosts at the per-minute rate", () => {
    const startsAt = futureStart();
    const published = publishHourLessonHourglass({
      creatorAiId: "ai-hvac-001",
      catalogId: "hvac-beginner",
      startsAt,
      priceCentsPerMinute: 100,
    });

    expect(published.session.creatorAiId).toBe("ai-hvac-001");
    expect(published.session.committedDurationMinutes).toBe(60);
    expect(published.session.priceCentsPerMinute).toBe(100);
    expect(published.session.priceCents).toBe(6000);
    expect(published.session.lessonVideoId).toBe(published.video.id);
    expect(published.video.sessionId).toBe(published.session.id);

    const stored = getLiveSession(published.session.id);
    expect(stored?.lessonVideoId).toBe(published.video.id);
    expect(getAiSessionProgram("ai-hvac-001").enabled).toBe(true);
    expect(getAiSessionProgram("ai-hvac-001").hostScript).toMatch(/hourglass/i);
    expect(published.session.lessonSegments?.length).toBeGreaterThanOrEqual(5);

    const join = getSessionJoinAccess({
      sessionId: published.session.id,
      userId: "owner",
      isPlatformOwner: true,
    });
    expect(join.hostPrompt).toMatch(/Generated hourglass lesson timeline/i);
    expect(join.hostPrompt).toMatch(/refrigeration cycle/i);
  });

  it("lets welding and plumbing AIs host custom beginner hours", () => {
    const weld = publishHourLessonHourglass({
      creatorAiId: "ai-welder-001",
      topic: "Beginner stick welding setup",
      startsAt: futureStart(15),
    });
    expect(weld.lesson.topic).toMatch(/stick welding/i);
    expect(weld.session.priceCentsPerMinute).toBe(20);
    expect(weld.session.priceCents).toBe(1200);

    const plumb = generateHourLessonVideo({
      creatorAiId: "ai-plumber-001",
      catalogId: "plumber-beginner",
    });
    expect(plumb.video.creatorAiId).toBe("ai-plumber-001");
    expect(plumb.lesson.safetyNote).toMatch(/licensed/i);
  });

  it("does not let owner-ops AIs host a public hourglass", () => {
    expect(() =>
      generateHourLessonVideo({
        creatorAiId: "platform-business-steward-ai",
        topic: "Private ops hour",
      }),
    ).toThrow(/cannot host/i);
  });

  it("rejects a catalog lesson on the wrong AI", () => {
    expect(() =>
      generateHourLessonVideo({
        creatorAiId: "ai-electrician-001",
        catalogId: "hvac-beginner",
      }),
    ).toThrow(/different AI/i);
  });
});
