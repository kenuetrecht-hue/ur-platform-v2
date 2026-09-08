/**
 * 1–5 star ratings on videos people watch. One rating per person per video.
 */

import { TRPCError } from "@trpc/server";
import { FAIR_SHOW_CONTENT_KINDS, type FairShowContentKind } from "../../lib/fair-show";
import {
  CREATOR_FREE_VIDEO_SHARE_NOTICE,
  CREATOR_PAID_VIDEO_NO_SHARE,
  isFreeShareableVideoKind,
} from "../../lib/creator-free-content-policy";
import { buildPlatformPublicUrl } from "../../lib/platform-urls";

export const VIDEO_STAR_MIN = 1;
export const VIDEO_STAR_MAX = 5;

export type VideoRatingKind = FairShowContentKind;

export type VideoRatingSummary = {
  contentId: string;
  kind: VideoRatingKind;
  average: number;
  count: number;
  myStars: number | null;
};

const ratings = new Map<string, Map<string, number>>(); // contentId -> userId -> stars
const kinds = new Map<string, VideoRatingKind>();

function keyOk(contentId: string): void {
  if (!contentId.trim()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Video is required." });
  }
}

export function rateVideo(params: {
  contentId: string;
  kind: VideoRatingKind;
  userId: string;
  stars: number;
}): VideoRatingSummary {
  keyOk(params.contentId);
  if (!FAIR_SHOW_CONTENT_KINDS.includes(params.kind)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown video type." });
  }
  const stars = Math.round(params.stars);
  if (stars < VIDEO_STAR_MIN || stars > VIDEO_STAR_MAX) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Pick 1 to 5 stars.",
    });
  }
  const existing = ratings.get(params.contentId) ?? new Map<string, number>();
  existing.set(params.userId, stars);
  ratings.set(params.contentId, existing);
  kinds.set(params.contentId, params.kind);
  return getVideoRating(params.contentId, params.userId);
}

export function getVideoRating(contentId: string, userId?: string): VideoRatingSummary {
  const map = ratings.get(contentId) ?? new Map<string, number>();
  let sum = 0;
  for (const stars of map.values()) sum += stars;
  const count = map.size;
  const average = count === 0 ? 0 : Math.round((sum / count) * 10) / 10;
  return {
    contentId,
    kind: kinds.get(contentId) ?? "social_video",
    average,
    count,
    myStars: userId ? map.get(userId) ?? null : null,
  };
}

export function getVideoRatingsByIds(contentIds: string[], userId?: string): Record<string, VideoRatingSummary> {
  const out: Record<string, VideoRatingSummary> = {};
  for (const id of contentIds) {
    out[id] = getVideoRating(id, userId);
  }
  return out;
}

export function assertFreeVideoShareAllowed(kind: string): void {
  if (!isFreeShareableVideoKind(kind)) {
    throw new TRPCError({ code: "FORBIDDEN", message: CREATOR_PAID_VIDEO_NO_SHARE });
  }
}

export function buildFreeVideoShareText(params: {
  title: string;
  creatorName: string;
  href: string;
  kind: string;
}): { shareText: string } {
  assertFreeVideoShareAllowed(params.kind);
  const origin = params.href.startsWith("http")
    ? params.href
    : buildPlatformPublicUrl(params.href.startsWith("/") ? params.href : `/${params.href}`);
  return {
    shareText: [
      `${params.creatorName} on UR Platform`,
      params.title.trim().slice(0, 200) || "Free video",
      CREATOR_FREE_VIDEO_SHARE_NOTICE,
      origin,
    ].join("\n"),
  };
}

export function _resetVideoRatingsForTests(): void {
  ratings.clear();
  kinds.clear();
}
