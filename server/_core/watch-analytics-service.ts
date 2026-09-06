/**
 * Creator + owner watch analytics. In-memory MVP — persist before production.
 * A view counts after 3 seconds. Numbers are real; we never invent them.
 */

import { TRPCError } from "@trpc/server";
import {
  completionRate,
  FAIR_SHOW_RULES,
  isQualifyingView,
  watchCheckpoint,
  type FairShowContentKind,
} from "../../lib/fair-show";
import { listAllTransactions } from "./transaction-ledger-service";

export type WatchContentRecord = {
  contentId: string;
  kind: FairShowContentKind;
  creatorId: string;
  title: string;
  category: string;
  durationSeconds: number;
  publishedAt: string;
  /** Live class / replay ledger key when different from contentId. */
  sessionId?: string;
};

export type ContentWatchStats = WatchContentRecord & {
  impressions: number;
  starts: number;
  qualifyingViews: number;
  uniqueViewers: number;
  uniqueQualifyingViewers: number;
  completedViews: number;
  averageCompletion: number;
  dropOff: { start: number; held15s: number; p25: number; p50: number; p75: number; p100: number };
  paidActions: number;
  paidCents: number;
};

type ViewerProgress = {
  secondsWatched: number;
  lastHeartbeatAt: number;
  qualified: boolean;
  completed: boolean;
  maxCheckpoint: 0 | 25 | 50 | 75 | 100;
};

const catalog = new Map<string, WatchContentRecord>();
const impressionUsers = new Map<string, Map<string, number>>();
const viewers = new Map<string, Map<string, ViewerProgress>>();
const impressionTotals = new Map<string, number>();

export function _resetWatchAnalyticsForTests(): void {
  catalog.clear();
  impressionUsers.clear();
  viewers.clear();
  impressionTotals.clear();
}

export function registerWatchContent(record: WatchContentRecord): WatchContentRecord {
  const existing = catalog.get(record.contentId);
  const next: WatchContentRecord = {
    ...existing,
    ...record,
    durationSeconds: Math.max(1, Math.round(record.durationSeconds)),
    title: record.title.trim().slice(0, 200),
    category: (record.category || "general").trim().toLowerCase().slice(0, 64),
  };
  catalog.set(next.contentId, next);
  return next;
}

export function getWatchContent(contentId: string): WatchContentRecord | null {
  return catalog.get(contentId) ?? null;
}

export function listWatchCatalog(): WatchContentRecord[] {
  return [...catalog.values()];
}

function viewerMap(contentId: string): Map<string, ViewerProgress> {
  let map = viewers.get(contentId);
  if (!map) {
    map = new Map();
    viewers.set(contentId, map);
  }
  return map;
}

export function recordContentImpression(params: {
  contentId: string;
  viewerUserId: string;
  now?: number;
}): { counted: boolean } {
  const item = catalog.get(params.contentId);
  if (!item) {
    throw new TRPCError({ code: "NOT_FOUND", message: "That video is not on Fair Show yet." });
  }
  if (params.viewerUserId === item.creatorId) return { counted: false };
  const now = params.now ?? Date.now();
  let users = impressionUsers.get(params.contentId);
  if (!users) {
    users = new Map();
    impressionUsers.set(params.contentId, users);
  }
  const last = users.get(params.viewerUserId) ?? 0;
  if (now - last < 6 * 60 * 60 * 1000) return { counted: false };
  users.set(params.viewerUserId, now);
  impressionTotals.set(params.contentId, (impressionTotals.get(params.contentId) ?? 0) + 1);
  return { counted: true };
}

export function recordWatchHeartbeat(params: {
  contentId: string;
  viewerUserId: string;
  secondsWatched: number;
  durationSeconds?: number;
  completed?: boolean;
  now?: number;
}): {
  countedView: boolean;
  checkpoint: 0 | 25 | 50 | 75 | 100;
  completion: number;
} {
  const item = catalog.get(params.contentId);
  if (!item) {
    throw new TRPCError({ code: "NOT_FOUND", message: "That video is not on Fair Show yet." });
  }
  if (params.viewerUserId === item.creatorId) {
    return { countedView: false, checkpoint: 0, completion: 0 };
  }

  const now = params.now ?? Date.now();
  const duration = Math.max(1, params.durationSeconds ?? item.durationSeconds);
  const seconds = Math.max(0, Math.min(duration + 30, Math.round(params.secondsWatched)));
  const progress = viewerMap(params.contentId);
  const prev = progress.get(params.viewerUserId);
  if (prev && now - prev.lastHeartbeatAt < 8_000 && seconds <= prev.secondsWatched) {
    return {
      countedView: prev.qualified,
      checkpoint: prev.maxCheckpoint,
      completion: completionRate(prev.secondsWatched, duration),
    };
  }

  const completion = completionRate(seconds, duration);
  const checkpoint = watchCheckpoint(params.completed ? 1 : completion);
  const qualified = isQualifyingView(seconds);
  const completed = Boolean(params.completed) || completion >= 0.99;
  const next: ViewerProgress = {
    secondsWatched: Math.max(prev?.secondsWatched ?? 0, seconds),
    lastHeartbeatAt: now,
    qualified: Boolean(prev?.qualified || qualified),
    completed: Boolean(prev?.completed || completed),
    maxCheckpoint: Math.max(prev?.maxCheckpoint ?? 0, checkpoint) as 0 | 25 | 50 | 75 | 100,
  };
  progress.set(params.viewerUserId, next);
  return { countedView: next.qualified, checkpoint: next.maxCheckpoint, completion };
}

function paidForContent(item: WatchContentRecord): { paidActions: number; paidCents: number } {
  const txs = listAllTransactions({ userId: item.creatorId, limit: 400 }).filter((tx) => {
    if (tx.payeeUserId !== item.creatorId) return false;
    if (tx.status !== "completed") return false;
    if (tx.type !== "live_class_ticket" && tx.type !== "class_replay_ticket" && tx.type !== "tip") {
      return false;
    }
    if (item.kind === "live_class" || item.kind === "class_replay") {
      const keys = new Set([item.contentId, item.sessionId].filter(Boolean));
      return !tx.sessionId || keys.has(tx.sessionId);
    }
    return true;
  });
  const scoped =
    item.kind === "live_class" || item.kind === "class_replay"
      ? txs.filter((tx) => {
          const keys = new Set([item.contentId, item.sessionId].filter(Boolean));
          return !tx.sessionId || keys.has(tx.sessionId);
        })
      : txs;
  return {
    paidActions: scoped.length,
    paidCents: scoped.reduce((sum, tx) => sum + tx.amountCents, 0),
  };
}

export function getContentWatchStats(contentId: string): ContentWatchStats | null {
  const item = catalog.get(contentId);
  if (!item) return null;
  const progress = viewers.get(contentId) ?? new Map();
  const rows = [...progress.values()];
  const uniqueViewers = rows.length;
  const uniqueQualifying = rows.filter((row) => row.qualified).length;
  const completions = rows.map((row) => completionRate(row.secondsWatched, item.durationSeconds));
  const averageCompletion =
    completions.length > 0 ? completions.reduce((sum, value) => sum + value, 0) / completions.length : 0;
  const paid = paidForContent(item);
  return {
    ...item,
    impressions: impressionTotals.get(contentId) ?? 0,
    starts: uniqueViewers,
    qualifyingViews: uniqueQualifying,
    uniqueViewers,
    uniqueQualifyingViewers: uniqueQualifying,
    completedViews: rows.filter((row) => row.completed).length,
    averageCompletion: Math.round(averageCompletion * 1000) / 1000,
    dropOff: {
      start: uniqueViewers,
      held15s: rows.filter((row) => row.secondsWatched >= FAIR_SHOW_RULES.heartbeatSeconds).length,
      p25: rows.filter((row) => row.maxCheckpoint >= 25).length,
      p50: rows.filter((row) => row.maxCheckpoint >= 50).length,
      p75: rows.filter((row) => row.maxCheckpoint >= 75).length,
      p100: rows.filter((row) => row.maxCheckpoint >= 100 || row.completed).length,
    },
    paidActions: paid.paidActions,
    paidCents: paid.paidCents,
  };
}

export function listCreatorWatchAnalytics(creatorId: string): {
  creatorId: string;
  videos: ContentWatchStats[];
  uniqueViewers: number;
  qualifyingViews: number;
  averageCompletion: number;
  paidActions: number;
  paidCents: number;
} {
  const videos = listWatchCatalog()
    .filter((item) => item.creatorId === creatorId)
    .map((item) => getContentWatchStats(item.contentId))
    .filter((item): item is ContentWatchStats => Boolean(item))
    .sort((a, b) => b.uniqueQualifyingViewers - a.uniqueQualifyingViewers || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const uniqueViewers = videos.reduce((sum, video) => sum + video.uniqueViewers, 0);
  const qualifyingViews = videos.reduce((sum, video) => sum + video.qualifyingViews, 0);
  const averageCompletion =
    videos.length > 0 ? videos.reduce((sum, video) => sum + video.averageCompletion, 0) / videos.length : 0;
  return {
    creatorId,
    videos,
    uniqueViewers,
    qualifyingViews,
    averageCompletion: Math.round(averageCompletion * 1000) / 1000,
    paidActions: videos.reduce((sum, video) => sum + video.paidActions, 0),
    paidCents: videos.reduce((sum, video) => sum + video.paidCents, 0),
  };
}

export function getOwnerWatchOverview(): {
  videoCount: number;
  creatorCount: number;
  uniqueViewers: number;
  starvedCreators: Array<{ creatorId: string; impressions: number; videoCount: number }>;
  topFinishers: Array<{ contentId: string; title: string; creatorId: string; averageCompletion: number }>;
} {
  const byCreator = new Map<string, { impressions: number; videoCount: number }>();
  const stats = listWatchCatalog().map((item) => getContentWatchStats(item.contentId)!);
  for (const video of stats) {
    const row = byCreator.get(video.creatorId) ?? { impressions: 0, videoCount: 0 };
    row.impressions += video.impressions;
    row.videoCount += 1;
    byCreator.set(video.creatorId, row);
  }
  const starvedCreators = [...byCreator.entries()]
    .filter(([, row]) => row.impressions === 0)
    .map(([creatorId, row]) => ({ creatorId, ...row }))
    .slice(0, 20);
  const topFinishers = [...stats]
    .filter((video) => video.qualifyingViews > 0)
    .sort((a, b) => b.averageCompletion - a.averageCompletion)
    .slice(0, 8)
    .map((video) => ({
      contentId: video.contentId,
      title: video.title,
      creatorId: video.creatorId,
      averageCompletion: video.averageCompletion,
    }));
  return {
    videoCount: stats.length,
    creatorCount: byCreator.size,
    uniqueViewers: stats.reduce((sum, video) => sum + video.uniqueViewers, 0),
    starvedCreators,
    topFinishers,
  };
}
