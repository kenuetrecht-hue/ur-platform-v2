import { describe, it, expect } from "vitest";
import { getCreatorAi } from "../server/_core/ai-creator-registry";
import { getCurriculumForCreator } from "../server/_core/ai-learning-mode";
import {
  getCreativePracticeExercises,
  getCreativeTeachingModules,
  isCreativeTeachingCreator,
} from "../server/_core/creative-arts-teaching-curriculum";
import { getCatalogCreator } from "../lib/ai-creator-catalog";

const CREATIVE_IDS = [
  "ai-author-001",
  "ai-poet-001",
  "ai-songwriter-001",
  "ai-logo-brand-001",
  "ai-musician-001",
] as const;

describe("Creative arts learning curriculum", () => {
  it.each(CREATIVE_IDS)("%s has full learn modules", (creatorId) => {
    expect(isCreativeTeachingCreator(creatorId)).toBe(true);
    const modules = getCreativeTeachingModules(creatorId);
    expect(modules.length).toBeGreaterThanOrEqual(8);
    expect(modules.some((m) => m.certificationPrep)).toBe(true);
  });

  it("Musician AI is registered with instrument-teaching mission", () => {
    expect(getCatalogCreator("ai-musician-001")?.name).toBe("Musician AI");
    const def = getCreatorAi("ai-musician-001");
    expect(def?.inScope.join(" ")).toMatch(/guitar|piano|drums/i);
    const curriculum = getCurriculumForCreator(def!);
    expect(curriculum.length).toBeGreaterThanOrEqual(10);
    expect(curriculum.some((m) => /notation|scale|chord/i.test(m.title))).toBe(true);
    expect(curriculum.some((m) => /Music Studio|turntable/i.test(m.title))).toBe(true);
  });

  it("provides practice exercises for musician and songwriter", () => {
    expect(
      getCreativePracticeExercises({ creatorId: "ai-musician-001", count: 3 }).length,
    ).toBeGreaterThan(0);
    expect(
      getCreativePracticeExercises({ creatorId: "ai-songwriter-001", count: 2 }).length,
    ).toBeGreaterThan(0);
  });
});
