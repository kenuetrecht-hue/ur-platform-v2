import { describe, expect, it, beforeEach } from "vitest";
import { enrollContentCreator, _resetPartnerProgramForTests } from "../server/_core/partner-program-service";
import {
  recordWatchHeartbeat,
  registerWatchContent,
  _resetWatchAnalyticsForTests,
} from "../server/_core/watch-analytics-service";
import { getFairShowPage, getMyFairShowAnalytics } from "../server/_core/fair-show-service";

describe("Fair Show service", () => {
  beforeEach(() => {
    _resetWatchAnalyticsForTests();
    if (typeof _resetPartnerProgramForTests === "function") {
      _resetPartnerProgramForTests();
    }
  });

  it("ranks a finished video into Discover and shows why", () => {
    enrollContentCreator({
      userId: "creator-fair-1",
      userEmail: "c1@test.com",
      displayName: "Pat",
    });
    registerWatchContent({
      contentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      kind: "cartoon",
      creatorId: "creator-fair-1",
      title: "Trap primer cartoon",
      category: "plumbing",
      durationSeconds: 20,
      publishedAt: new Date().toISOString(),
    });
    recordWatchHeartbeat({
      contentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      viewerUserId: "viewer-1",
      secondsWatched: 18,
      completed: true,
    });
    const page = getFairShowPage({ viewerUserId: "viewer-2", limit: 8 });
    expect(page.items[0]?.title).toBe("Trap primer cartoon");
    expect(page.items[0]?.why).toMatch(/lane/i);
    expect(page.rules.join(" ").toLowerCase()).toContain("pay-to-rank");
  });

  it("gives the creator stay-on-video numbers, not vanity reloads", () => {
    enrollContentCreator({
      userId: "creator-fair-2",
      userEmail: "c2@test.com",
      displayName: "Sam",
    });
    registerWatchContent({
      contentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
      kind: "cartoon",
      creatorId: "creator-fair-2",
      title: "Short lesson",
      category: "lesson",
      durationSeconds: 16,
      publishedAt: new Date().toISOString(),
    });
    recordWatchHeartbeat({
      contentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
      viewerUserId: "viewer-a",
      secondsWatched: 1,
    });
    recordWatchHeartbeat({
      contentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
      viewerUserId: "viewer-b",
      secondsWatched: 14,
    });
    const mine = getMyFairShowAnalytics("creator-fair-2");
    expect(mine.qualifyingViews).toBe(1);
    expect(mine.videos[0]?.dropOff.p75).toBe(1);
  });
});
