import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { rankForMemberInterests } from "../lib/content-rank";
import { guardUnsourcedNewsReply } from "../lib/ai-factuality";
import { saveMemberInterests, _resetMemberInterestsForTests } from "../server/_core/member-interest-service";
import { createFeedPost, getFeed } from "../server/_core/social-feed-service";
import { registerSocialUser } from "../server/_core/social-service";
import { buildCreatorSystemPrompt } from "../server/_core/ai-creator-registry";

describe("member interests and news facts", () => {
  const authorId = "interest-author";
  const viewerId = "interest-viewer";
  registerSocialUser({ userId: authorId, email: "interest-author@test.com", displayName: "Author" });
  registerSocialUser({ userId: viewerId, email: "interest-viewer@test.com", displayName: "Viewer" });

  it("leads with matching posts and still keeps something else in the mix", () => {
    const ranked = rankForMemberInterests(
      [
        { id: "other", text: "A quiet note about the weather" },
        { id: "music", text: "Tune the guitar before the song" },
        { id: "also", text: "Another unrelated line" },
      ],
      ["music"],
      (item) => item.text,
    );
    expect(ranked[0]?.id).toBe("music");
    expect(ranked.map((item) => item.id)).toContain("other");
  });

  it("ranks a music video ahead of an unrelated post for a music interest", () => {
    _resetMemberInterestsForTests();
    saveMemberInterests(viewerId, ["music"]);
    createFeedPost({
      authorUserId: authorId,
      authorEmail: "interest-author@test.com",
      authorName: "Author",
      body: "A note about the porch light",
      rightsConfirmed: true,
    });
    const video = createFeedPost({
      authorUserId: authorId,
      authorEmail: "interest-author@test.com",
      authorName: "Author",
      body: "New guitar song from the studio",
      kind: "video",
      videoUrl: "https://urplatform.llc/video/guitar",
      rightsConfirmed: true,
    });
    const feed = getFeed({ viewerUserId: viewerId, sort: "forYou", interests: ["music"] });
    expect(feed.posts[0]?.id).toBe(video.id);
    expect(feed.nextCursor).toBeNull();
  });

  it("refuses an invented news headline and explains a pasted source", () => {
    expect(guardUnsourcedNewsReply("what happened today?", "Breaking today: officials said turnout hit 62%.")).toMatch(
      /will not state that as fact/i,
    );
    expect(guardUnsourcedNewsReply("explain https://example.com/story", "The link says the vote was close.")).toMatch(
      /only worked from the source you pasted/i,
    );
    expect(buildCreatorSystemPrompt("ai-news-001")).toContain("Do not write a headline");
  });

  it("asks for interests on the home screen and offers For you on the feed", () => {
    const home = readFileSync("app/(tabs)/index.tsx", "utf8");
    const feed = readFileSync("components/social-feed-panel.tsx", "utf8");
    const card = readFileSync("components/member-interest-card.tsx", "utf8");
    expect(home).toContain("MemberInterestCard");
    expect(feed).toContain('id: "forYou"');
    expect(card).toContain("LETTERING_ON_WHITE");
    expect(card).toContain("#FFFFFF");
  });
});
