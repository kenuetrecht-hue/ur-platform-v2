/**
 * UR Fair Show catalog + Discover page.
 * Syncs published cartoons, class replays, live classes, and social videos.
 */

import {
  FAIR_SHOW_PLAIN_RULES,
  FAIR_SHOW_RULES,
  fairShowScore,
  fairShowWhyCopy,
  fillFairShowLanes,
  isNewCreator,
  type FairShowLane,
} from "../../lib/fair-show";
import { listAllPublishedCartoons, getPublishedCartoon } from "./cartoon-studio-service";
import { listPublishedReplays } from "./class-replay-service";
import { listLiveSessions } from "./ai-live-session-service";
import { listDiscoverableVideoPosts } from "./social-feed-service";
import { getContentCreatorProfile, listCreatorRoster } from "./partner-program-service";
import {
  getContentWatchStats,
  getOwnerWatchOverview,
  listCreatorWatchAnalytics,
  listWatchCatalog,
  recordContentImpression,
  registerWatchContent,
  type ContentWatchStats,
} from "./watch-analytics-service";

function categoryFromText(...parts: Array<string | undefined>): string {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  if (/\b(electric|electrical|wire|conduit)\b/.test(text)) return "electrical";
  if (/\b(plumb|pipe|pex|drain)\b/.test(text)) return "plumbing";
  if (/\b(hvac|furnace|duct)\b/.test(text)) return "hvac";
  if (/\b(weld|fabricat)\b/.test(text)) return "welding";
  if (/\b(cook|recipe|kitchen|food)\b/.test(text)) return "cooking";
  if (/\b(language|spanish|english|lingua)\b/.test(text)) return "language";
  if (/\b(cartoon|toon)\b/.test(text)) return "cartoon";
  if (/\b(class|lesson|teach|hourglass)\b/.test(text)) return "lesson";
  return "general";
}

export function syncFairShowCatalog(): void {
  for (const project of listAllPublishedCartoons()) {
    registerWatchContent({
      contentId: project.id,
      kind: "cartoon",
      creatorId: project.userId,
      title: project.title,
      category: categoryFromText(project.style, project.title, project.idea),
      durationSeconds: project.totalSeconds,
      publishedAt: project.publishedAt ?? project.createdAt,
    });
  }

  for (const replay of listPublishedReplays()) {
    registerWatchContent({
      contentId: replay.id,
      kind: "class_replay",
      creatorId: replay.hostUserId ?? replay.creatorAiId,
      title: replay.title,
      category: categoryFromText(replay.title, replay.description, replay.creatorName),
      durationSeconds: Math.max(60, replay.durationMinutes * 60),
      publishedAt: replay.publishedAt,
      sessionId: replay.sessionId,
    });
  }

  for (const session of listLiveSessions()) {
    if (session.status !== "scheduled" && session.status !== "live") continue;
    if (!session.hostUserId) continue;
    registerWatchContent({
      contentId: session.id,
      kind: "live_class",
      creatorId: session.hostUserId,
      title: session.title,
      category: categoryFromText(session.title, session.creatorName),
      durationSeconds: session.committedDurationMinutes * 60,
      publishedAt: session.createdAt,
      sessionId: session.id,
    });
  }

  for (const post of listDiscoverableVideoPosts()) {
    registerWatchContent({
      contentId: post.id,
      kind: "social_video",
      creatorId: post.authorUserId,
      title: post.body.slice(0, 80) || "Social video",
      category: categoryFromText(post.body, post.hashtags.join(" ")),
      durationSeconds: 30,
      publishedAt: post.createdAt,
    });
  }
}

function creatorVideoCount(creatorId: string): number {
  return listWatchCatalog().filter((item) => item.creatorId === creatorId).length;
}

export type FairShowCard = {
  contentId: string;
  kind: ContentWatchStats["kind"];
  creatorId: string;
  creatorName: string;
  title: string;
  category: string;
  durationSeconds: number;
  publishedAt: string;
  lane: FairShowLane;
  why: string;
  score: number;
  isNewCreator: boolean;
  uniqueViewers: number;
  qualifyingViews: number;
  finishPercent: number;
  paidActions: number;
  href: string;
};

function hrefFor(stats: ContentWatchStats): string {
  if (stats.kind === "cartoon") return "/cartoon-studio";
  if (stats.kind === "class_replay") return `/class-replay/${stats.contentId}`;
  if (stats.kind === "live_class") return `/live-session/${stats.sessionId ?? stats.contentId}`;
  return "/(tabs)/messages";
}

export function getFairShowPage(params: {
  viewerUserId: string;
  limit?: number;
  category?: string;
}): { rules: readonly string[]; lanes: typeof FAIR_SHOW_RULES; items: FairShowCard[] } {
  syncFairShowCatalog();
  const limit = Math.min(Math.max(params.limit ?? 12, 4), 30);
  const category = params.category?.trim().toLowerCase();
  const candidates = listWatchCatalog()
    .map((item) => getContentWatchStats(item.contentId))
    .filter((item): item is ContentWatchStats => Boolean(item))
    .filter((item) => (category ? item.category === category : true))
    .map((item) => {
      const profile = getContentCreatorProfile(item.creatorId);
      const fresh = isNewCreator({
        enrolledAt: profile?.enrolledAt,
        creatorVideoCount: creatorVideoCount(item.creatorId),
        impressions: item.impressions,
      });
      const breakdown = fairShowScore({
        uniqueViewers: item.uniqueQualifyingViewers,
        qualifyingViews: item.qualifyingViews,
        averageCompletion: item.averageCompletion,
        paidActions: item.paidActions,
        publishedAt: item.publishedAt,
        impressions: item.impressions,
        enrolledAt: profile?.enrolledAt,
        creatorVideoCount: creatorVideoCount(item.creatorId),
      });
      return {
        id: item.contentId,
        creatorId: item.creatorId,
        category: item.category,
        isNewCreator: fresh,
        score: breakdown.total,
        stats: item,
        creatorName: profile?.displayName ?? "Creator",
      };
    });

  const placed = fillFairShowLanes(candidates, limit, category);
  const items: FairShowCard[] = placed.map((card) => {
    recordContentImpression({ contentId: card.id, viewerUserId: params.viewerUserId });
    const finishPercent = Math.round(card.stats.averageCompletion * 100);
    return {
      contentId: card.stats.contentId,
      kind: card.stats.kind,
      creatorId: card.creatorId,
      creatorName: card.creatorName,
      title: card.stats.title,
      category: card.category,
      durationSeconds: card.stats.durationSeconds,
      publishedAt: card.stats.publishedAt,
      lane: card.lane,
      why: fairShowWhyCopy({
        lane: card.lane,
        finishPercent,
        uniqueViewers: card.stats.uniqueQualifyingViewers,
        paidActions: card.stats.paidActions,
      }),
      score: card.score,
      isNewCreator: card.isNewCreator,
      uniqueViewers: card.stats.uniqueQualifyingViewers,
      qualifyingViews: card.stats.qualifyingViews,
      finishPercent,
      paidActions: card.stats.paidActions,
      href: hrefFor(card.stats),
    };
  });

  return { rules: FAIR_SHOW_PLAIN_RULES, lanes: FAIR_SHOW_RULES, items };
}

export function getMyFairShowAnalytics(userId: string) {
  syncFairShowCatalog();
  const watch = listCreatorWatchAnalytics(userId);
  const profile = getContentCreatorProfile(userId);
  const fresh = isNewCreator({
    enrolledAt: profile?.enrolledAt,
    creatorVideoCount: watch.videos.length,
    impressions: watch.videos.reduce((sum, video) => sum + video.impressions, 0),
  });
  return {
    ...watch,
    enrolledAt: profile?.enrolledAt ?? null,
    isNewCreator: fresh,
    laneHint: fresh
      ? "You are in the new-creator lane — about 20% of Discover is reserved for you."
      : "You are in the quality lane — finish rate and paid tickets move you up.",
    rules: FAIR_SHOW_PLAIN_RULES,
    videos: watch.videos.map((video) => ({
      ...video,
      why: fairShowWhyCopy({
        lane: fresh ? "new" : "quality",
        finishPercent: Math.round(video.averageCompletion * 100),
        uniqueViewers: video.uniqueQualifyingViewers,
        paidActions: video.paidActions,
      }),
    })),
  };
}

export function getOwnerFairShowBoard() {
  syncFairShowCatalog();
  const overview = getOwnerWatchOverview();
  const roster = listCreatorRoster();
  const nameById = new Map(roster.map((row) => [row.userId, row.displayName]));
  return {
    ...overview,
    rules: FAIR_SHOW_PLAIN_RULES,
    payToRank: FAIR_SHOW_RULES.payToRank,
    starvedCreators: overview.starvedCreators.map((row) => ({
      ...row,
      displayName: nameById.get(row.creatorId) ?? row.creatorId,
    })),
    rosterSize: roster.length,
  };
}

export function resolveWatchTarget(contentId: string) {
  syncFairShowCatalog();
  const cartoon = getPublishedCartoon(contentId);
  if (cartoon) {
    registerWatchContent({
      contentId: cartoon.id,
      kind: "cartoon",
      creatorId: cartoon.userId,
      title: cartoon.title,
      category: categoryFromText(cartoon.style, cartoon.title),
      durationSeconds: cartoon.totalSeconds,
      publishedAt: cartoon.publishedAt ?? cartoon.createdAt,
    });
  }
  return getContentWatchStats(contentId);
}
