import { describe, it, expect } from "vitest";
import {
  analyzeSchematicInput,
  BLUEPRINT_READER_AI_ID,
  detectSchematicType,
  SCHEMATIC_TYPES,
} from "../server/_core/blueprint-reading-service";
import {
  getBlueprintTeachingModules,
  isBlueprintTeachingCreator,
} from "../server/_core/blueprint-teaching-curriculum";
import { ALL_CREATOR_AI_IDS, getCreatorAi } from "../server/_core/ai-creator-registry";
import { validateCatalogSync } from "../lib/ai-creator-catalog-sync";

describe("Blueprint Reader AI", () => {
  it("is registered in server registry and public catalog", () => {
    expect(ALL_CREATOR_AI_IDS).toContain(BLUEPRINT_READER_AI_ID);
    const sync = validateCatalogSync([...ALL_CREATOR_AI_IDS]);
    expect(sync.missingFromServer).not.toContain(BLUEPRINT_READER_AI_ID);
    expect(getCreatorAi(BLUEPRINT_READER_AI_ID)?.name).toBe("Blueprint Reader AI");
  });

  it("detects electrical schematics from description", () => {
    const r = detectSchematicType("200A panel schedule and NEC one-line diagram");
    expect(r.type).toBe("electrical");
    expect(r.confidence).toBeGreaterThan(0.4);
  });

  it("detects P&ID from description", () => {
    const r = detectSchematicType("P&ID showing valve symbols and pipe run");
    expect(r.type).toBe("plumbing_pid");
  });

  it("analyzes schematic with trends and checklist", () => {
    const a = analyzeSchematicInput({
      description: "Architectural floor plan second level with door schedule",
      fileName: "A-201.pdf",
    });
    expect(a.detectedType).toBe("architectural");
    expect(a.readingChecklist.length).toBeGreaterThan(3);
    expect(a.industryTrends.length).toBeGreaterThan(0);
    expect(a.suggestedSpecialists).toContain("ai-framer-001");
  });

  it("supports 15 schematic types", () => {
    expect(SCHEMATIC_TYPES.length).toBe(15);
  });

  it("has full teaching curriculum", () => {
    expect(isBlueprintTeachingCreator(BLUEPRINT_READER_AI_ID)).toBe(true);
    const modules = getBlueprintTeachingModules();
    expect(modules.length).toBeGreaterThanOrEqual(10);
    expect(modules.some((m) => m.title.includes("BIM"))).toBe(true);
  });
});
