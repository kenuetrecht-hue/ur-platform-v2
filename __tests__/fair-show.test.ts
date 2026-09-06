import { describe, expect, it } from "vitest";
import {
  completionRate,
  FAIR_SHOW_PLAIN_RULES,
  FAIR_SHOW_RULES,
  fairShowScore,
  fairShowWhyCopy,
  fillFairShowLanes,
  isNewCreator,
  isQualifyingView,
  laneQuotas,
  recencyBoost,
  watchCheckpoint,
} from "../lib/fair-show";

describe("UR Fair Show ranking", () => {
  it("does not count a one-second open as a view", () => {
    expect(isQualifyingView(1)).toBe(false);
    expect(isQualifyingView(FAIR_SHOW_RULES.qualifyingViewSeconds)).toBe(true);
  });

  it("scores stay-on-video higher than raw opens", () => {
    const now = Date.parse("2026-09-06T12:00:00.000Z");
    const finished = fairShowScore({
      uniqueViewers: 12,
      qualifyingViews: 12,
      averageCompletion: 0.8,
      paidActions: 2,
      publishedAt: "2026-09-05T12:00:00.000Z",
      impressions: 40,
      creatorVideoCount: 40,
      now,
    });
    const skipped = fairShowScore({
      uniqueViewers: 40,
      qualifyingViews: 40,
      averageCompletion: 0.08,
      paidActions: 0,
      publishedAt: "2026-09-05T12:00:00.000Z",
      impressions: 400,
      creatorVideoCount: 40,
      now,
    });
    expect(finished.total).toBeGreaterThan(skipped.total);
  });

  it("treats new creators as eligible for the reserved lane", () => {
    expect(
      isNewCreator({
        enrolledAt: "2026-08-20T00:00:00.000Z",
        creatorVideoCount: 3,
        impressions: 10,
        now: Date.parse("2026-09-06T00:00:00.000Z"),
      }),
    ).toBe(true);
    expect(
      isNewCreator({
        enrolledAt: "2025-01-01T00:00:00.000Z",
        creatorVideoCount: 80,
        impressions: 5000,
        now: Date.parse("2026-09-06T00:00:00.000Z"),
      }),
    ).toBe(false);
  });

  it("decays yesterday's hit so it cannot own Discover forever", () => {
    const now = Date.parse("2026-09-06T12:00:00.000Z");
    const fresh = recencyBoost("2026-09-06T00:00:00.000Z", now);
    const stale = recencyBoost("2026-08-01T00:00:00.000Z", now);
    expect(fresh).toBeGreaterThan(stale);
    expect(stale).toBeLessThan(0.05);
  });

  it("fills quality, new, and category lanes and caps one creator", () => {
    const items = Array.from({ length: 12 }, (_, index) => ({
      id: `v${index}`,
      creatorId: index < 8 ? "big-channel" : `new-${index}`,
      category: index % 2 === 0 ? "electrical" : "cooking",
      isNewCreator: index >= 8,
      score: 1 - index * 0.04,
    }));
    const page = fillFairShowLanes(items, 10, "electrical");
    expect(page.filter((item) => item.creatorId === "big-channel").length).toBeLessThanOrEqual(
      FAIR_SHOW_RULES.maxItemsPerCreator,
    );
    expect(page.some((item) => item.lane === "new")).toBe(true);
    expect(page.some((item) => item.lane === "category")).toBe(true);
    expect(laneQuotas(10).quality).toBe(6);
  });

  it("records finish checkpoints and prints why a video is showing", () => {
    expect(watchCheckpoint(completionRate(8, 10))).toBe(75);
    expect(watchCheckpoint(1)).toBe(100);
    expect(fairShowWhyCopy({ lane: "quality", finishPercent: 62, uniqueViewers: 12, paidActions: 3 })).toContain(
      "Quality lane",
    );
    expect(FAIR_SHOW_PLAIN_RULES.join(" ").toLowerCase()).toContain("pay-to-rank");
    expect(FAIR_SHOW_RULES.payToRank).toBe(false);
  });
});
