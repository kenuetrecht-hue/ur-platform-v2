import { describe, it, expect } from "vitest";
import { getCreatorAi } from "../server/_core/ai-creator-registry";
import { getCurriculumForCreator } from "../server/_core/ai-learning-mode";
import {
  getLegalMasterPracticeExercises,
  getLegalMasterTeachingModules,
  isLegalMasterTeachingCreator,
  LEGAL_MASTER_CREATOR_IDS,
} from "../server/_core/legal-masters-teaching-curriculum";
import { getCatalogCreator } from "../lib/ai-creator-catalog";
import { AI_HUB_CATEGORY_GROUPS } from "../lib/ai-hub-navigation";

const LEGAL_MASTER_IDS = [...LEGAL_MASTER_CREATOR_IDS];

describe("Legal Masters learning curriculum", () => {
  it("has a dedicated Legal Masters hub tab", () => {
    const tab = AI_HUB_CATEGORY_GROUPS.find((g) => g.id === "legalMasters");
    expect(tab?.label).toBe("Legal Masters");
    expect(tab?.categories).toContain("Legal Masters");
  });

  it.each(LEGAL_MASTER_IDS)("%s has full learn modules with cert prep", (creatorId) => {
    expect(isLegalMasterTeachingCreator(creatorId)).toBe(true);
    const modules = getLegalMasterTeachingModules(creatorId);
    expect(modules.length).toBeGreaterThanOrEqual(10);
    expect(modules.some((m) => m.certificationPrep)).toBe(true);
    expect(modules.some((m) => /legal research|document drafting/i.test(m.title))).toBe(true);
  });

  it("Credit Attorney is registered with credit-repair mission", () => {
    expect(getCatalogCreator("ai-attorney-credit-001")?.category).toBe("Legal Masters");
    const def = getCreatorAi("ai-attorney-credit-001");
    expect(def?.inScope.join(" ")).toMatch(/credit|dispute|FCRA/i);
    const curriculum = getCurriculumForCreator(def!);
    expect(curriculum.some((m) => /credit score|dispute|build credit/i.test(m.title))).toBe(true);
  });

  it("provides practice exercises for credit and criminal masters", () => {
    expect(
      getLegalMasterPracticeExercises({ creatorId: "ai-attorney-credit-001", count: 3 }).length,
    ).toBeGreaterThan(0);
    expect(
      getLegalMasterPracticeExercises({ creatorId: "ai-attorney-criminal-001", count: 2 }).length,
    ).toBeGreaterThan(0);
  });
});
