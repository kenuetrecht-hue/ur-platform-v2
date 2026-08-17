import { describe, expect, it } from "vitest";
import { AI_CREATOR_CATALOG } from "../lib/ai-creator-catalog";
import { filterCreatorsByGroup, firstCreatorInGroup } from "../lib/ai-hub-navigation";
import { LANDING_DEMO_CREATOR_IDS } from "../lib/landing-demo-policy";

const demoCreators = AI_CREATOR_CATALOG.filter((c) =>
  (LANDING_DEMO_CREATOR_IDS as readonly string[]).includes(c.id),
);

describe("landing AI category hub filtering", () => {
  it("shows all demo specialists under All", () => {
    expect(filterCreatorsByGroup(demoCreators, "all")).toHaveLength(LANDING_DEMO_CREATOR_IDS.length);
  });

  it("filters Platform to platform-category demos only", () => {
    const platform = filterCreatorsByGroup(demoCreators, "platform");
    expect(platform.map((c) => c.id).sort()).toEqual(
      ["ai-coder-001", "contentmate", "linguamate"].sort(),
    );
  });

  it("filters Automotive & Marine to marina mechanic", () => {
    const marine = filterCreatorsByGroup(demoCreators, "automotive");
    expect(marine).toHaveLength(1);
    expect(marine[0]?.id).toBe("ai-marina-mechanic-001");
  });

  it("returns empty for categories without demo specialists", () => {
    expect(filterCreatorsByGroup(demoCreators, "legalMasters")).toHaveLength(0);
    expect(filterCreatorsByGroup(demoCreators, "engineering")).toHaveLength(0);
  });

  it("picks first specialist when switching category", () => {
    const next = firstCreatorInGroup(demoCreators, "creative");
    expect(next?.id).toBe("ai-3d-specialist");
  });
});
