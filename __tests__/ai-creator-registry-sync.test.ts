import { describe, it, expect } from "vitest";
import { ALL_CREATOR_AI_IDS } from "../server/_core/ai-creator-registry";
import {
  validateCatalogSync,
  PUBLIC_CATALOG_IDS,
  EXPECTED_PUBLIC_COUNT,
  getFullCatalogEntries,
} from "../lib/ai-creator-catalog-sync";

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
