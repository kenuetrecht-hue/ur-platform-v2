import { describe, expect, it, beforeEach } from "vitest";
import {
  buildTownHallPanel,
  scheduleTownHallSession,
  _clearTownHallForTests,
  getTownHallSession,
} from "../server/_core/hive-town-hall-service";
import { getCreatorAi } from "../server/_core/ai-creator-registry";

describe("hive town hall", () => {
  beforeEach(() => {
    _clearTownHallForTests();
  });

  it("builds one specialist per category for all_categories mode", () => {
    const panel = buildTownHallPanel({ mode: "all_categories" });
    expect(panel.length).toBeGreaterThan(3);
    const uniqueCategories = new Set(panel.map((id) => getCreatorAi(id)?.category));
    expect(uniqueCategories.size).toBe(panel.length);
  });

  it("recommends real estate specialists for pricing questions", () => {
    const panel = buildTownHallPanel({
      mode: "recommended",
      message: "regular pricing on houses for sale in my area",
    });
    expect(panel[0]).toBe("ai-realestate-001");
  });

  it("schedules a session with live status when start time is now", () => {
    const session = scheduleTownHallSession({
      hostUserId: "user-1",
      title: "Market check",
      scheduledAt: new Date().toISOString(),
      panelMode: "all_categories",
    });
    expect(session.specialistIds.length).toBeGreaterThan(0);
    const loaded = getTownHallSession(session.id, "user-1");
    expect(loaded?.status).toBe("live");
  });
});
