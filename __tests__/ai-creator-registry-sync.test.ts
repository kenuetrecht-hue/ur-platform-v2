import { describe, it, expect } from "vitest";
import { ALL_CREATOR_AI_IDS, getCreatorAi, isCreatorAiId } from "../server/_core/ai-creator-registry";
import {
  validateCatalogSync,
  PUBLIC_CATALOG_IDS,
  EXPECTED_PUBLIC_COUNT,
  getFullCatalogEntries,
} from "../lib/ai-creator-catalog-sync";
import { getHandoffSuggestions } from "../server/_core/ai-handoff-service";
import { getHivePeers, scoreCreatorDomainMatch } from "../server/_core/ai-hive-capabilities";
import { getCurriculumForCreator } from "../server/_core/ai-learning-mode";
import { getCatalogCreator } from "../lib/ai-creator-catalog";

const MARINA_ID = "ai-marina-mechanic-001";

describe("AI creator catalog sync", () => {
  it("public catalog has expected count", () => {
    expect(PUBLIC_CATALOG_IDS.length).toBe(EXPECTED_PUBLIC_COUNT);
    expect(PUBLIC_CATALOG_IDS.length).toBeGreaterThanOrEqual(41);
  });

  it("every public catalog ID exists in server registry", () => {
    const result = validateCatalogSync([...ALL_CREATOR_AI_IDS]);
    expect(result.missingFromServer).toEqual([]);
  });

  it("full catalog includes owner ops", () => {
    const full = getFullCatalogEntries();
    expect(full.length).toBeGreaterThanOrEqual(44);
    expect(full.some((c) => c.id === "platform-doctor-ai")).toBe(true);
    expect(full.some((c) => c.id === "ai-welder-001")).toBe(true);
  });

  it("public catalog IDs are unique", () => {
    expect(new Set(PUBLIC_CATALOG_IDS).size).toBe(PUBLIC_CATALOG_IDS.length);
  });
});

describe("Marina Mechanic AI", () => {
  it("is registered on server and in client catalog", () => {
    expect(isCreatorAiId(MARINA_ID)).toBe(true);
    expect(ALL_CREATOR_AI_IDS).toContain(MARINA_ID);
    expect(getCatalogCreator(MARINA_ID)?.name).toBe("Marina Mechanic AI");
    expect(getCatalogCreator(MARINA_ID)?.category).toBe("Marine");
  });

  it("has marine mission scope and system prompt inputs", () => {
    const def = getCreatorAi(MARINA_ID);
    expect(def?.name).toBe("Marina Mechanic AI");
    expect(def?.category).toBe("Marine");
    expect(def?.inScope.join(" ")).toMatch(/marina|outboard|3D workspace/i);
    expect(def?.outOfScope.join(" ")).toMatch(/surveyor|Automotive/i);
  });

  it("routes marine domain keywords to this specialist", () => {
    expect(scoreCreatorDomainMatch(MARINA_ID, "My outboard engine won't start after winter")).toBeGreaterThan(0);
    expect(scoreCreatorDomainMatch(MARINA_ID, "How do I run a marina fuel dock safely?")).toBeGreaterThan(0);
  });

  it("has hive peers, handoffs, and learn modules", () => {
    expect(getHivePeers(MARINA_ID)).toContain("ai-3d-specialist");
    expect(getHivePeers(MARINA_ID)).toContain("ai-electrician-001");
    expect(getHandoffSuggestions(MARINA_ID).some((h) => h.targetCreatorId === "ai-3d-specialist")).toBe(true);
    const def = getCreatorAi(MARINA_ID);
    expect(def).toBeDefined();
    expect(getCurriculumForCreator(def!).length).toBeGreaterThanOrEqual(4);
  });
});
