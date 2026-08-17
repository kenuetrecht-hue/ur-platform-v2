import { describe, it, expect, beforeEach } from "vitest";
import {
  recordLandingDemoStart,
  recordLandingDemoSignupClick,
  recordLandingDemoConversion,
  getLandingDemoConversionStats,
  _clearLandingDemoAttributionForTests,
} from "../server/_core/landing-demo-attribution-service";

describe("landing demo attribution", () => {
  beforeEach(() => {
    _clearLandingDemoAttributionForTests();
  });

  it("tracks demo → signup click → account conversion", () => {
    const demo = recordLandingDemoStart({
      ip: "203.0.113.10",
      creatorId: "ai-coder-001",
      platform: "web",
    });

    recordLandingDemoSignupClick(demo.id);
    recordLandingDemoConversion({ attributionId: demo.id, userId: "user-42" });

    const stats = getLandingDemoConversionStats();
    expect(stats.totalDemos).toBe(1);
    expect(stats.totalSignupClicks).toBe(1);
    expect(stats.totalConversions).toBe(1);
    expect(stats.demoToSignupRate).toBe(1);
    expect(stats.byCreator[0]?.creatorId).toBe("ai-coder-001");
    expect(stats.byPlatform[0]?.platform).toBe("web");
  });

  it("does not double-count conversion", () => {
    const demo = recordLandingDemoStart({
      ip: "203.0.113.11",
      creatorId: "contentmate",
      platform: "ios",
    });

    recordLandingDemoConversion({ attributionId: demo.id, userId: "user-1" });
    recordLandingDemoConversion({ attributionId: demo.id, userId: "user-1" });

    expect(getLandingDemoConversionStats().totalConversions).toBe(1);
  });
});
