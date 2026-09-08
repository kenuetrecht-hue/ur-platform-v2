/**
 * Live UR AI Free Board — specialists publish free text and video+text lessons.
 * Seeded on boot and rotated on a timer so the site is never empty.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { getCatalogCreator } from "../../lib/ai-creator-catalog";
import {
  AI_FREE_BOARD_DISCLOSURE,
  AI_FREE_BOARD_PUBLISH_INTERVAL_MS,
  AI_FREE_BOARD_RULE,
  AI_FREE_BOARD_START_TEXT,
  AI_FREE_BOARD_START_WATCH,
  type AiFreeBoardLane,
} from "../../lib/ai-free-board-policy";
import { AI_FREE_BOARD_SEEDS, type AiFreeBoardSeed } from "../../lib/ai-free-board-catalog";
import { CREATOR_FREE_VIDEO_SHARE_NOTICE } from "../../lib/creator-free-content-policy";
import { buildPlatformPublicUrl } from "../../lib/platform-urls";
import { sanitizeUserText } from "./input-sanitize";

export type AiFreeBoardPost = {
  id: string;
  seedId: string;
  creatorAiId: string;
  creatorName: string;
  creatorAvatar: string;
  category: string;
  lane: AiFreeBoardLane;
  title: string;
  body: string;
  durationMinutes?: number;
  publishedAt: string;
  likeCount: number;
  shareCount: number;
  disclosure: string;
};

export type AiFreeBoardPostView = AiFreeBoardPost & {
  likedByMe: boolean;
  talkHref: string;
};

const posts = new Map<string, AiFreeBoardPost>();
const likes = new Map<string, Set<string>>();
const usedSeeds = new Set<string>();
let nextSeedIndex = 0;
let publisherTimer: ReturnType<typeof setInterval> | null = null;

function creatorCard(creatorAiId: string) {
  const creator = getCatalogCreator(creatorAiId);
  if (!creator) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown UR AI." });
  }
  return creator;
}

function publishSeed(seed: AiFreeBoardSeed, publishedAtMs = Date.now()): AiFreeBoardPost {
  const creator = creatorCard(seed.creatorAiId);
  const post: AiFreeBoardPost = {
    id: randomUUID(),
    seedId: seed.seedId,
    creatorAiId: seed.creatorAiId,
    creatorName: creator.name,
    creatorAvatar: creator.avatar,
    category: creator.category,
    lane: seed.lane,
    title: sanitizeUserText(seed.title, 160),
    body: sanitizeUserText(seed.body, 2000),
    durationMinutes: seed.durationMinutes,
    publishedAt: new Date(publishedAtMs).toISOString(),
    likeCount: 0,
    shareCount: 0,
    disclosure: AI_FREE_BOARD_DISCLOSURE,
  };
  posts.set(post.id, post);
  likes.set(post.id, new Set());
  usedSeeds.add(seed.seedId);
  return post;
}

function nextUnusedSeed(prefer?: AiFreeBoardLane): AiFreeBoardSeed {
  const pool = prefer ? AI_FREE_BOARD_SEEDS.filter((s) => s.lane === prefer) : AI_FREE_BOARD_SEEDS;
  const unused = pool.filter((s) => !usedSeeds.has(s.seedId));
  if (unused.length > 0) {
    return unused[0]!;
  }
  const seed = pool[nextSeedIndex % pool.length]!;
  nextSeedIndex += 1;
  return seed;
}

export function ensureAiFreeBoardSeeded(): { text: number; watch: number } {
  const textHave = [...posts.values()].filter((p) => p.lane === "text").length;
  const watchHave = [...posts.values()].filter((p) => p.lane === "watch").length;
  let text = 0;
  let watch = 0;
  while (textHave + text < AI_FREE_BOARD_START_TEXT) {
    publishSeed(nextUnusedSeed("text"));
    text += 1;
  }
  while (watchHave + watch < AI_FREE_BOARD_START_WATCH) {
    publishSeed(nextUnusedSeed("watch"));
    watch += 1;
  }
  return { text: textHave + text, watch: watchHave + watch };
}

export function publishNextAiFreeBoardPost(prefer?: AiFreeBoardLane): AiFreeBoardPost {
  return publishSeed(nextUnusedSeed(prefer));
}

export function listAiFreeBoard(params: {
  lane?: AiFreeBoardLane;
  viewerUserId?: string;
  limit?: number;
}): { posts: AiFreeBoardPostView[]; rule: string; textCount: number; watchCount: number } {
  ensureAiFreeBoardSeeded();
  const limit = Math.min(params.limit ?? 40, 60);
  const all = [...posts.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const filtered = params.lane ? all.filter((p) => p.lane === params.lane) : all;
  return {
    rule: AI_FREE_BOARD_RULE,
    textCount: all.filter((p) => p.lane === "text").length,
    watchCount: all.filter((p) => p.lane === "watch").length,
    posts: filtered.slice(0, limit).map((post) => ({
      ...post,
      likeCount: likes.get(post.id)?.size ?? 0,
      likedByMe: params.viewerUserId ? Boolean(likes.get(post.id)?.has(params.viewerUserId)) : false,
      talkHref: `/ai/${post.creatorAiId}`,
    })),
  };
}

export function toggleAiFreeBoardLike(params: { postId: string; userId: string }): {
  liked: boolean;
  likeCount: number;
} {
  const post = posts.get(params.postId);
  if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "That AI post is gone." });
  const set = likes.get(params.postId) ?? new Set<string>();
  let liked: boolean;
  if (set.has(params.userId)) {
    set.delete(params.userId);
    liked = false;
  } else {
    set.add(params.userId);
    liked = true;
  }
  likes.set(params.postId, set);
  post.likeCount = set.size;
  posts.set(post.id, post);
  return { liked, likeCount: set.size };
}

export function shareAiFreeBoardPost(postId: string): { shareCount: number; shareText: string } {
  const post = posts.get(postId);
  if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "That AI post is gone." });
  post.shareCount += 1;
  posts.set(post.id, post);
  return {
    shareCount: post.shareCount,
    shareText: [
      `${post.creatorName} on the UR AI Free Board`,
      post.title,
      post.body.slice(0, 200),
      AI_FREE_BOARD_DISCLOSURE,
      CREATOR_FREE_VIDEO_SHARE_NOTICE,
      buildPlatformPublicUrl("/discover/ai-board"),
    ].join("\n"),
  };
}

export function startAiFreeBoardPublisher(): void {
  ensureAiFreeBoardSeeded();
  if (publisherTimer) return;
  publisherTimer = setInterval(() => {
    try {
      const prefer: AiFreeBoardLane = Date.now() % 2 === 0 ? "text" : "watch";
      publishNextAiFreeBoardPost(prefer);
    } catch (error) {
      console.warn("[ai-free-board] rotate failed:", error);
    }
  }, AI_FREE_BOARD_PUBLISH_INTERVAL_MS);
}

export function stopAiFreeBoardPublisher(): void {
  if (publisherTimer) {
    clearInterval(publisherTimer);
    publisherTimer = null;
  }
}

export function _resetAiFreeBoardForTests(): void {
  stopAiFreeBoardPublisher();
  posts.clear();
  likes.clear();
  usedSeeds.clear();
  nextSeedIndex = 0;
}
