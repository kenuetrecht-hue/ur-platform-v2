import { describe, it, expect, beforeEach } from "vitest";
import {
  levenshtein,
  rankDocuments,
  scoreDocument,
  suggestDidYouMean,
  tokenizeQuery,
} from "../lib/platform-search-engine";
import { searchPlatform } from "../server/_core/platform-search-service";
import { _resetAiFreeBoardForTests } from "../server/_core/ai-free-board-service";
import { _resetPartnerProgramForTests, enrollContentCreator } from "../server/_core/partner-program-service";
import { createFeedPost } from "../server/_core/social-feed-service";
import { registerSocialUser } from "../server/_core/social-service";
import { isOwnerOpsAiId } from "../lib/owner-platform-ops-catalog";

describe("platform search engine", () => {
  it("treats close spellings as a match", () => {
    expect(levenshtein("electrician", "electrican")).toBe(1);
    const hit = scoreDocument(
      {
        id: "1",
        kind: "specialist",
        title: "Electrician Expert AI",
        body: "Troubleshoot electrical on the job",
        href: "/ai/ai-electrician-001",
        category: "Construction",
      },
      "electrition",
    );
    expect(hit).toBeTruthy();
    expect(hit!.score).toBeGreaterThan(20);
  });

  it("maps Spanish to language specialists", () => {
    expect(tokenizeQuery("Spanish")).toContain("linguamate");
    const ranked = rankDocuments(
      [
        {
          id: "ling",
          kind: "specialist",
          title: "LinguaMate",
          body: "Universal language translator and teacher",
          href: "/ai/linguamate",
          category: "Platform",
        },
        {
          id: "weld",
          kind: "specialist",
          title: "AI Welder",
          body: "Troubleshoot welders",
          href: "/ai/ai-welder-001",
          category: "Construction",
        },
      ],
      "Spanish",
    );
    expect(ranked[0]?.id).toBe("ling");
  });

  it("suggests a close title when nothing ranks", () => {
    expect(suggestDidYouMean("weldr", ["AI Welder", "Culinary Arts AI"])).toBe("AI Welder");
  });
});

describe("platform search service", () => {
  beforeEach(() => {
    _resetAiFreeBoardForTests();
    if (typeof _resetPartnerProgramForTests === "function") _resetPartnerProgramForTests();
  });

  it("finds UR AIs and free board lessons without searching the web", () => {
    const result = searchPlatform({ query: "electrician" });
    expect(result.rule.toLowerCase()).toContain("does not search the internet");
    expect(result.hits.some((hit) => hit.kind === "specialist" && hit.title.toLowerCase().includes("electrician"))).toBe(
      true,
    );
    expect(result.hits.some((hit) => hit.href.includes("web-search"))).toBe(false);
    expect(result.hits.every((hit) => !isOwnerOpsAiId(hit.id.replace("specialist:", "")))).toBe(true);
  });

  it("finds human creators and public posts, not friends-only posts", () => {
    enrollContentCreator({
      userId: "creator-search-1",
      userEmail: "c@test.com",
      displayName: "Marina Shop",
    });
    registerSocialUser({ userId: "author-s", email: "a@test.com", displayName: "Author" });
    createFeedPost({
      authorUserId: "author-s",
      authorEmail: "a@test.com",
      authorName: "Author",
      body: "Public guitar lesson notes",
      rightsConfirmed: true,
    });
    createFeedPost({
      authorUserId: "author-s",
      authorEmail: "a@test.com",
      authorName: "Author",
      body: "Secret friends guitar riff",
      visibility: "friends",
      rightsConfirmed: true,
    });
    const creators = searchPlatform({ query: "Marina" });
    expect(creators.hits.some((hit) => hit.kind === "creator" && hit.title === "Marina Shop")).toBe(true);
    expect(creators.hits.some((hit) => JSON.stringify(hit).toLowerCase().includes("c@test.com"))).toBe(false);
    const posts = searchPlatform({ query: "guitar" });
    expect(posts.hits.some((hit) => hit.kind === "post" && hit.body.includes("Public guitar"))).toBe(true);
    expect(posts.hits.some((hit) => hit.body.includes("Secret friends"))).toBe(false);
  });
});
