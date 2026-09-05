/**
 * Owner AIs assemble hour-long lesson videos and host them on hourglasses
 * (60-minute paid classes billed per minute).
 */

import { TRPCError } from "@trpc/server";
import {
  buildCustomHourLesson,
  buildHourLessonHostScript,
  getHourglassLesson,
  HOURGLASS_LESSON_MINUTES,
  listHourglassTradeLessons,
  type HourLessonCatalogEntry,
} from "../../lib/ai-hour-lesson-catalog";
import { getCreatorAi } from "./ai-creator-registry";
import { isOwnerOnlyPlatformAi } from "./platform-ops-ai";
import { sanitizeUserText } from "./input-sanitize";
import {
  attachLessonVideoToLiveSession,
  scheduleLiveSession,
  type AiLiveSession,
} from "./ai-live-session-service";
import { CREATOR_MIN_PRICE_CENTS_PER_MINUTE, setAiSessionProgram } from "./ai-session-programming";
import {
  attachVideoToSession,
  requestHourLessonVideo,
  type CreatorVideoJob,
} from "./ai-creator-video-service";

export function listPublishableHourLessons(): HourLessonCatalogEntry[] {
  return listHourglassTradeLessons();
}

export function resolveHourLesson(params: {
  creatorAiId: string;
  catalogId?: string;
  topic?: string;
}): HourLessonCatalogEntry {
  if (isOwnerOnlyPlatformAi(params.creatorAiId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Owner ops AIs cannot host public paid hourglasses.",
    });
  }
  const creator = getCreatorAi(params.creatorAiId);
  if (!creator) {
    throw new TRPCError({ code: "NOT_FOUND", message: "AI specialist not found." });
  }

  if (params.catalogId) {
    const catalog = getHourglassLesson(params.catalogId);
    if (!catalog) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Hourglass lesson not found." });
    }
    if (catalog.creatorAiId !== params.creatorAiId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "That lesson belongs to a different AI.",
      });
    }
    return catalog;
  }

  const topic = sanitizeUserText(params.topic ?? "", 300);
  if (topic.length < 4) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Choose a catalog lesson or enter a topic of at least 4 characters.",
    });
  }
  return buildCustomHourLesson({
    creatorAiId: params.creatorAiId,
    creatorName: creator.name,
    topic,
  });
}

export function generateHourLessonVideo(params: {
  creatorAiId: string;
  catalogId?: string;
  topic?: string;
}): { lesson: HourLessonCatalogEntry; video: CreatorVideoJob } {
  const lesson = resolveHourLesson(params);
  const video = requestHourLessonVideo({
    creatorAiId: lesson.creatorAiId,
    topic: lesson.topic,
    title: lesson.title,
    description: lesson.description,
    segments: lesson.segments,
    safetyNote: lesson.safetyNote,
  });
  return { lesson, video };
}

export function publishHourLessonHourglass(params: {
  creatorAiId: string;
  startsAt: string;
  catalogId?: string;
  topic?: string;
  priceCentsPerMinute?: number;
  maxAttendees?: number;
}): {
  lesson: HourLessonCatalogEntry;
  video: CreatorVideoJob;
  session: AiLiveSession;
} {
  const { lesson, video } = generateHourLessonVideo(params);
  const priceCentsPerMinute = Math.max(
    CREATOR_MIN_PRICE_CENTS_PER_MINUTE,
    Math.round(params.priceCentsPerMinute ?? CREATOR_MIN_PRICE_CENTS_PER_MINUTE),
  );

  setAiSessionProgram({
    creatorAiId: lesson.creatorAiId,
    enabled: true,
    durationMinutes: HOURGLASS_LESSON_MINUTES,
    priceCentsPerMinute,
    maxAttendees: params.maxAttendees,
    allowOvertime: true,
    defaultTitle: lesson.title,
    sessionDescription: `${lesson.description} ${lesson.safetyNote}`,
    hostScript: buildHourLessonHostScript(lesson),
  });

  const session = scheduleLiveSession({
    creatorAiId: lesson.creatorAiId,
    title: lesson.title,
    description: `${lesson.description} ${lesson.safetyNote}`,
    startsAt: params.startsAt,
    durationMinutes: HOURGLASS_LESSON_MINUTES,
    priceCentsPerMinute,
    maxAttendees: params.maxAttendees,
    lessonVideoId: video.id,
    lessonSafetyNote: lesson.safetyNote,
    lessonSegments: lesson.segments,
  });

  attachVideoToSession(video.id, session.id);
  attachLessonVideoToLiveSession(session.id, video.id);

  return { lesson, video, session };
}
