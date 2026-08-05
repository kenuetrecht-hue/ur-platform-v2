import { describe, it, expect, beforeEach } from "vitest";
import {
  buildCreatorShareText,
  buildClassShareText,
  buildFacebookPromoDraft,
} from "../server/_core/creator-dashboard-service";
import { scheduleLiveSession } from "../server/_core/ai-live-session-service";
import { setAiSessionProgram } from "../server/_core/ai-session-programming";
import { enrollContentCreator } from "../server/_core/partner-program-service";

describe("Creator dashboard promo & share", () => {
  const creatorAiId = "ai-coder-001";

  beforeEach(() => {
    setAiSessionProgram({
      creatorAiId,
      enabled: true,
      durationMinutes: 60,
      priceCentsPerMinute: 50,
      maxAttendees: 5000,
      allowOvertime: true,
    });
  });

  it("builds creator share text with URL", () => {
    const text = buildCreatorShareText({
      displayName: "Ken",
      customUrl: "https://urplatform.app/link/ken-abc1",
    });
    expect(text).toContain("https://urplatform.app/link/ken-abc1");
    expect(text).toContain("UR Platform");
  });

  it("builds class share text with ticket link", () => {
    enrollContentCreator({
      userId: "cr-dash-1",
      userEmail: "k@test.com",
      displayName: "Ken",
    });
    const session = scheduleLiveSession({
      creatorAiId,
      startsAt: new Date(Date.now() + 86400000).toISOString(),
      title: "Live Content Workshop",
      hostUserId: "cr-dash-1",
    });
    const text = buildClassShareText({ displayName: "Ken", session });
    expect(text).toContain("Live Content Workshop");
    expect(text).toContain(`/live-session/${session.id}`);
  });

  it("builds Facebook promo draft for upcoming class", () => {
    const session = scheduleLiveSession({
      creatorAiId,
      startsAt: new Date(Date.now() + 86400000).toISOString(),
      title: "AI Marketing Masterclass",
      hostUserId: "cr-dash-2",
    });
    const draft = buildFacebookPromoDraft({
      displayName: "Ken",
      customUrl: "https://urplatform.app/link/ken",
      upcomingClass: session,
    });
    expect(draft).toContain("Hey friends");
    expect(draft).toContain("AI Marketing Masterclass");
    expect(draft).toContain(session.id);
  });
});
