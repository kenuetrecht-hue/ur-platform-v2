import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { getCreatorAi, listCreatorsForClient } from "../server/_core/ai-creator-registry";
import {
  assertCanAccessOwnerAiLearning,
  getCertificationOverview,
  getCurriculumForCreator,
} from "../server/_core/ai-learning-mode";
import {
  BUSINESS_STEWARD_AI_ID,
  getOwnerBusinessPracticeExercises,
  getOwnerBusinessSelfPacedPath,
  getOwnerBusinessTeachingModules,
  getOwnerBusinessTeachingTagline,
} from "../server/_core/owner-business-teaching-curriculum";
import {
  canChatBusinessSteward,
  canChatOwnerOpsAi,
  isOwnerOnlyPlatformAi,
} from "../server/_core/platform-ops-ai";
import {
  buildWebSearchQuery,
  findDominantSpecialistForMessage,
  getHiveCapabilities,
  getHivePeers,
  shouldRunWebSearch,
} from "../server/_core/ai-hive-capabilities";

const STEWARD = BUSINESS_STEWARD_AI_ID;

describe("Business Steward operator academy", () => {
  it("has a full Learn curriculum with self-paced paths and practice", () => {
    const modules = getOwnerBusinessTeachingModules();
    expect(modules.length).toBeGreaterThanOrEqual(16);
    expect(modules.some((m) => /unit economics/i.test(m.title))).toBe(true);
    expect(modules.some((m) => m.certificationPrep)).toBe(true);
    expect(getOwnerBusinessSelfPacedPath("beginner").length).toBeGreaterThanOrEqual(4);
    expect(getOwnerBusinessSelfPacedPath("advanced").some((s) => /go-live/i.test(s.moduleTitle))).toBe(
      true,
    );
    expect(getOwnerBusinessPracticeExercises({ count: 5 }).length).toBe(5);
    expect(getOwnerBusinessTeachingTagline()).toMatch(/operator academy/i);

    const def = getCreatorAi(STEWARD);
    expect(def).toBeDefined();
    expect(getCurriculumForCreator(def!).length).toBe(modules.length);
    expect(getCertificationOverview(def!).title).toMatch(/operator self-check/i);
  });

  it("keeps Learn APIs private to the platform owner", () => {
    expect(() => assertCanAccessOwnerAiLearning(STEWARD, false)).toThrow(TRPCError);
    expect(() => assertCanAccessOwnerAiLearning(STEWARD, true)).not.toThrow();
    expect(() => assertCanAccessOwnerAiLearning("ai-marketing-001", false)).not.toThrow();
  });

  it("is hidden from members and blocked for staff chat", () => {
    expect(isOwnerOnlyPlatformAi(STEWARD)).toBe(true);
    expect(canChatBusinessSteward({ isPlatformOwner: true })).toBe(true);
    expect(canChatBusinessSteward({ isPlatformOwner: false })).toBe(false);
    expect(canChatOwnerOpsAi({ isPlatformOwner: false, canChatOwnerOps: true })).toBe(true);
    const publicList = listCreatorsForClient({ includeOwnerOps: false });
    expect(publicList.some((c) => c.id === STEWARD)).toBe(false);
  });

  it("has hive tools matching other specialists plus operator search", () => {
    const caps = getHiveCapabilities(STEWARD);
    expect(caps.longTermMemory).toBe(true);
    expect(caps.webSearch).toBe(true);
    expect(caps.safeguardedLearning).toBe(true);
    expect(caps.photoAnalysis).toBe(true);
    expect(caps.imageGeneration).toBe(true);
    expect(getHivePeers(STEWARD)).toEqual(
      expect.arrayContaining([
        "ai-marketing-001",
        "ai-sales-001",
        "ai-operations-001",
        "contentmate",
        "ai-logo-brand-001",
      ]),
    );
    expect(shouldRunWebSearch("When is Indiana estimated tax ES-40 due?", caps, STEWARD)).toBe(true);
    expect(shouldRunWebSearch("Meta ads policy for an 18+ marketplace", caps, STEWARD)).toBe(true);
    expect(buildWebSearchQuery("INBiz biennial report", STEWARD)).toMatch(/INBiz|IRS\.gov/i);
    expect(findDominantSpecialistForMessage("indiana llc estimated tax due date")?.creatorId).not.toBe(
      STEWARD,
    );
  });
});
