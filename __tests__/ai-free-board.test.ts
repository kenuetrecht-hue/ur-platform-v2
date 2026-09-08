import { describe, it, expect, beforeEach } from "vitest";
import {
  ensureAiFreeBoardSeeded,
  listAiFreeBoard,
  publishNextAiFreeBoardPost,
  shareAiFreeBoardPost,
  toggleAiFreeBoardLike,
  _resetAiFreeBoardForTests,
} from "../server/_core/ai-free-board-service";
import { AI_FREE_BOARD_SEEDS, listAiFreeBoardSeeds } from "../lib/ai-free-board-catalog";
import { AI_FREE_BOARD_RULE, AI_FREE_BOARD_START_TEXT, AI_FREE_BOARD_START_WATCH } from "../lib/ai-free-board-policy";
import { getCatalogCreator } from "../lib/ai-creator-catalog";

describe("AI free board catalog", () => {
  it("has both text and video+text seeds from real public AIs", () => {
    const text = listAiFreeBoardSeeds("text");
    const watch = listAiFreeBoardSeeds("watch");
    expect(text.length).toBeGreaterThan(10);
    expect(watch.length).toBeGreaterThan(8);
    for (const seed of AI_FREE_BOARD_SEEDS) {
      expect(getCatalogCreator(seed.creatorAiId)).toBeTruthy();
      expect(seed.title.length).toBeGreaterThan(8);
      expect(seed.body.length).toBeGreaterThan(40);
    }
    expect(new Set(AI_FREE_BOARD_SEEDS.map((s) => s.creatorAiId)).size).toBeGreaterThan(15);
  });
});

describe("AI free board service", () => {
  beforeEach(() => _resetAiFreeBoardForTests());

  it("seeds text and watch lanes so the site is never empty", () => {
    const seeded = ensureAiFreeBoardSeeded();
    expect(seeded.text).toBe(AI_FREE_BOARD_START_TEXT);
    expect(seeded.watch).toBe(AI_FREE_BOARD_START_WATCH);
    const all = listAiFreeBoard({});
    expect(all.posts.length).toBe(AI_FREE_BOARD_START_TEXT + AI_FREE_BOARD_START_WATCH);
    expect(all.textCount).toBe(AI_FREE_BOARD_START_TEXT);
    expect(all.watchCount).toBe(AI_FREE_BOARD_START_WATCH);
    expect(all.rule).toBe(AI_FREE_BOARD_RULE);
    expect(listAiFreeBoard({ lane: "text" }).posts.every((p) => p.lane === "text")).toBe(true);
    expect(listAiFreeBoard({ lane: "watch" }).posts.every((p) => p.lane === "watch")).toBe(true);
  });

  it("keeps publishing new AI material after the opening set", () => {
    ensureAiFreeBoardSeeded();
    const before = listAiFreeBoard({}).posts.length;
    const next = publishNextAiFreeBoardPost("text");
    expect(next.disclosure.toLowerCase()).toContain("ur platform ai");
    expect(listAiFreeBoard({}).posts.length).toBe(before + 1);
  });

  it("lets a member like and share a free AI post", () => {
    ensureAiFreeBoardSeeded();
    const post = listAiFreeBoard({ lane: "watch" }).posts[0]!;
    const liked = toggleAiFreeBoardLike({ postId: post.id, userId: "fan-1" });
    expect(liked.liked).toBe(true);
    expect(liked.likeCount).toBe(1);
    const shared = shareAiFreeBoardPost(post.id);
    expect(shared.shareCount).toBe(1);
    expect(shared.shareText).toContain("AI Free Board");
    expect(shared.shareText.toLowerCase()).toContain("free");
  });
});
