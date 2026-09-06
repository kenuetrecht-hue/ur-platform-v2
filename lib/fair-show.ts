/**
 * UR Fair Show — public ranking rules for Discover.
 * Watch quality first. New creators get a reserved lane. No pay-to-rank.
 */

export const FAIR_SHOW_RULES = {
  qualifyingViewSeconds: 3,
  heartbeatSeconds: 15,
  newCreatorDays: 30,
  newCreatorMaxVideos: 20,
  newCreatorMaxImpressions: 200,
  laneQualityShare: 0.6,
  laneNewShare: 0.2,
  laneCategoryShare: 0.2,
  weightCompletion: 0.4,
  weightUnique: 0.25,
  weightPaid: 0.2,
  weightRecency: 0.15,
  recencyHalfLifeHours: 48,
  maxItemsPerCreator: 2,
  payToRank: false,
} as const;

export const FAIR_SHOW_LANES = ["quality", "new", "category"] as const;
export type FairShowLane = (typeof FAIR_SHOW_LANES)[number];

export const FAIR_SHOW_CONTENT_KINDS = [
  "cartoon",
  "class_replay",
  "live_class",
  "social_video",
] as const;
export type FairShowContentKind = (typeof FAIR_SHOW_CONTENT_KINDS)[number];

export const FAIR_SHOW_PLAIN_RULES = [
  "A view counts after 3 seconds — not a one-second open.",
  "Rank by who stayed (finish rate), unique people, paid tickets/tips, and how new the video is.",
  "About 20% of Discover is reserved for new creators (first 30 days or first 20 videos).",
  "Videos stay in their trade — electrician with electrician, cooking with cooking.",
  "One creator cannot own the page (cap of 2 items per creator per page).",
  "Paid boosts are never mixed into this feed. There is no pay-to-rank.",
] as const;

export type FairShowScoreInput = {
  uniqueViewers: number;
  qualifyingViews: number;
  averageCompletion: number;
  paidActions: number;
  publishedAt: string;
  impressions: number;
  enrolledAt?: string;
  creatorVideoCount?: number;
  now?: number;
};

export type FairShowScoreBreakdown = {
  completion: number;
  unique: number;
  paid: number;
  recency: number;
  newCreatorBoost: number;
  total: number;
};

export function isQualifyingView(secondsWatched: number): boolean {
  return secondsWatched >= FAIR_SHOW_RULES.qualifyingViewSeconds;
}

export function completionRate(secondsWatched: number, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0;
  return Math.min(1, Math.max(0, secondsWatched / durationSeconds));
}

export function watchCheckpoint(completion: number): 0 | 25 | 50 | 75 | 100 {
  if (completion >= 0.99) return 100;
  if (completion >= 0.75) return 75;
  if (completion >= 0.5) return 50;
  if (completion >= 0.25) return 25;
  return 0;
}

export function recencyBoost(publishedAt: string, now = Date.now()): number {
  const ageMs = Math.max(0, now - Date.parse(publishedAt));
  const halfLifeMs = FAIR_SHOW_RULES.recencyHalfLifeHours * 60 * 60 * 1000;
  return Math.pow(0.5, ageMs / halfLifeMs);
}

export function logScaleScore(count: number): number {
  if (count <= 0) return 0;
  return Math.min(1, Math.log10(1 + count) / Math.log10(101));
}

export function isNewCreator(params: {
  enrolledAt?: string;
  creatorVideoCount?: number;
  impressions?: number;
  now?: number;
}): boolean {
  const now = params.now ?? Date.now();
  if (params.enrolledAt) {
    const ageMs = now - Date.parse(params.enrolledAt);
    if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < FAIR_SHOW_RULES.newCreatorDays * 24 * 60 * 60 * 1000) {
      return true;
    }
  }
  if ((params.creatorVideoCount ?? Number.POSITIVE_INFINITY) < FAIR_SHOW_RULES.newCreatorMaxVideos) {
    return true;
  }
  if ((params.impressions ?? Number.POSITIVE_INFINITY) < FAIR_SHOW_RULES.newCreatorMaxImpressions) {
    return true;
  }
  return false;
}

export function fairShowScore(input: FairShowScoreInput): FairShowScoreBreakdown {
  const completion = Math.min(1, Math.max(0, input.averageCompletion));
  const unique = logScaleScore(input.uniqueViewers);
  const paid = logScaleScore(input.paidActions);
  const recency = recencyBoost(input.publishedAt, input.now);
  const fresh = isNewCreator({
    enrolledAt: input.enrolledAt,
    creatorVideoCount: input.creatorVideoCount,
    impressions: input.impressions,
    now: input.now,
  });
  const newCreatorBoost = fresh ? 0.12 : 0;
  const total =
    FAIR_SHOW_RULES.weightCompletion * completion +
    FAIR_SHOW_RULES.weightUnique * unique +
    FAIR_SHOW_RULES.weightPaid * paid +
    FAIR_SHOW_RULES.weightRecency * recency +
    newCreatorBoost;
  return {
    completion,
    unique,
    paid,
    recency,
    newCreatorBoost,
    total: Math.round(total * 1000) / 1000,
  };
}

export type FairShowCandidate = {
  id: string;
  creatorId: string;
  category: string;
  isNewCreator: boolean;
  score: number;
};

export type FairShowPlaced<T extends FairShowCandidate> = T & {
  lane: FairShowLane;
  why: string;
};

export function laneQuotas(limit: number): Record<FairShowLane, number> {
  const quality = Math.max(1, Math.round(limit * FAIR_SHOW_RULES.laneQualityShare));
  const fresh = Math.max(1, Math.round(limit * FAIR_SHOW_RULES.laneNewShare));
  const category = Math.max(1, limit - quality - fresh);
  return { quality, new: fresh, category };
}

function explainLane<T extends FairShowCandidate>(item: T, lane: FairShowLane): string {
  if (lane === "new") return "New lane — reserved show time for newer creators.";
  if (lane === "category") return `Category lane — ${item.category || "same trade"}.`;
  return `Quality lane — score ${item.score.toFixed(2)} from stay-on-video, unique viewers, and sales.`;
}

export function fillFairShowLanes<T extends FairShowCandidate>(
  items: T[],
  limit: number,
  preferredCategory?: string,
): FairShowPlaced<T>[] {
  const quotas = laneQuotas(limit);
  const used = new Set<string>();
  const creatorCounts = new Map<string, number>();
  const ranked = [...items].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const placed: FairShowPlaced<T>[] = [];

  const take = (pool: T[], n: number, lane: FairShowLane) => {
    for (const item of pool) {
      if (placed.length >= limit) return;
      if (n <= 0) return;
      if (used.has(item.id)) continue;
      if ((creatorCounts.get(item.creatorId) ?? 0) >= FAIR_SHOW_RULES.maxItemsPerCreator) continue;
      used.add(item.id);
      creatorCounts.set(item.creatorId, (creatorCounts.get(item.creatorId) ?? 0) + 1);
      placed.push({ ...item, lane, why: explainLane(item, lane) });
      n -= 1;
    }
  };

  take(
    ranked.filter((item) => item.isNewCreator),
    quotas.new,
    "new",
  );
  take(
    ranked.filter((item) => !item.isNewCreator),
    quotas.quality,
    "quality",
  );

  const qualityCategories = new Set(
    placed.filter((item) => item.lane === "quality").map((item) => item.category),
  );
  const categoryPool = preferredCategory
    ? ranked.filter((item) => item.category === preferredCategory)
    : ranked.filter((item) => !qualityCategories.has(item.category) || qualityCategories.size === 0);
  take(categoryPool, quotas.category, "category");

  take(ranked, limit - placed.length, "quality");
  return placed.slice(0, limit);
}

export function fairShowWhyCopy(params: {
  lane: FairShowLane;
  finishPercent: number;
  uniqueViewers: number;
  paidActions: number;
}): string {
  const finish = `${Math.round(params.finishPercent)}% finished`;
  const people = `${params.uniqueViewers} unique ${params.uniqueViewers === 1 ? "viewer" : "viewers"}`;
  const paid = `${params.paidActions} paid ${params.paidActions === 1 ? "action" : "actions"}`;
  const lane =
    params.lane === "new" ? "New lane" : params.lane === "category" ? "Category lane" : "Quality lane";
  return `${lane} · ${finish} · ${people} · ${paid}`;
}
