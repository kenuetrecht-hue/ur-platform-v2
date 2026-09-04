import { describe, expect, it } from "vitest";
import { AI_CREATOR_CATALOG } from "../lib/ai-creator-catalog";
import {
  AI_HUB_CATEGORY_GROUPS,
  hubGroupIdForCategory,
  nextHubSelection,
} from "../lib/ai-hub-navigation";
import { listCreatorsForClient } from "../server/_core/ai-creator-registry";

describe("AI hub category coverage", () => {
  it("maps every public catalog category to a named hub tab", () => {
    const unmapped = [...new Set(AI_CREATOR_CATALOG.map((c) => c.category))].filter(
      (category) => hubGroupIdForCategory(category) === "all",
    );
    expect(unmapped).toEqual([]);
  });

  it("maps Culinary to Kitchen so the home shortcut stays on Culinary Arts", () => {
    expect(hubGroupIdForCategory("Culinary")).toBe("kitchen");
    expect(AI_HUB_CATEGORY_GROUPS.find((g) => g.id === "kitchen")?.categories).toContain("Culinary");
  });

  it("maps Manufacturing and Blueprint & Schematics to Engineering", () => {
    expect(hubGroupIdForCategory("Manufacturing")).toBe("engineering");
    expect(hubGroupIdForCategory("Blueprint & Schematics")).toBe("engineering");
  });

  it("does not snap a deep-linked Culinary Arts AI back to ContentMate", () => {
    const platformIds = AI_CREATOR_CATALOG.filter((c) => c.category === "Platform").map((c) => c.id);
    expect(
      nextHubSelection({
        deepLinkedAiId: "ai-culinary-001",
        selectedAiId: "ai-culinary-001",
        visibleIds: platformIds,
      }),
    ).toBe("ai-culinary-001");
  });

  it("maps every public client specialist category to a hub tab", () => {
    const unmapped = [
      ...new Set(listCreatorsForClient({ includeOwnerOps: false }).map((c) => c.category)),
    ].filter((category) => hubGroupIdForCategory(category) === "all");
    expect(unmapped).toEqual([]);
  });
});
