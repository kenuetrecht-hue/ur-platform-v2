import { z } from "zod";
import { secureProcedure, securePublicProcedure, router, TRPCError } from "../_core/trpc";
import { getCreatorAi, isCreatorAiId } from "../_core/ai-creator-registry";
import {
  getCurriculumForCreator,
  getCertificationOverview,
  handleCreatorLearningSession,
  assertCanAccessOwnerAiLearning,
  type LearningLevel,
  type LearningMode,
} from "../_core/ai-learning-mode";
import {
  getCoderPracticeExercises,
  getCoderSelfPacedPath,
  isCoderTeachingCreator,
} from "../_core/coder-teaching-curriculum";
import {
  getGamePracticeExercises,
  getGameSelfPacedPath,
  isGameTeachingCreator,
} from "../_core/game-dev-teaching-curriculum";
import {
  getBlockchainPracticeExercises,
  getBlockchainSelfPacedPath,
  isBlockchainTeachingCreator,
} from "../_core/blockchain-teaching-curriculum";
import {
  getBlueprintSelfPacedPath,
  isBlueprintTeachingCreator,
} from "../_core/blueprint-teaching-curriculum";
import {
  getCreativePracticeExercises,
  getCreativeSelfPacedPath,
  getCreativeTeachingTagline,
  isCreativeTeachingCreator,
} from "../_core/creative-arts-teaching-curriculum";
import {
  getLegalMasterPracticeExercises,
  getLegalMasterSelfPacedPath,
  getLegalMasterTeachingTagline,
  isLegalMasterTeachingCreator,
} from "../_core/legal-masters-teaching-curriculum";
import {
  getOwnerBusinessPracticeExercises,
  getOwnerBusinessSelfPacedPath,
  getOwnerBusinessTeachingTagline,
  isOwnerBusinessTeachingCreator,
} from "../_core/owner-business-teaching-curriculum";
import {
  getMathSelfPacedPath,
  isMathTeachingCreator,
} from "../_core/math-teaching-curriculum";
import {
  getReadingSelfPacedPath,
  isReadingTeachingCreator,
} from "../_core/reading-teaching-curriculum";
import {
  createPracticeQuestionSet,
  getLearningProgress,
  recordLessonComplete,
  updateLearningProgress,
} from "../_core/ai-learning-progress-service";
import { mapServiceErrorToTrpc } from "../_core/service-errors";
import { recordUserActivity } from "../_core/daily-engagement-service";

const levelSchema = z.enum(["beginner", "intermediate", "advanced"]);
const modeSchema = z.enum(["lesson", "practice", "certification", "on_the_job", "conversation"]);

function resolveLearningUserId(ctx: { user?: { id: unknown } | null; ip: string }): string {
  return ctx.user?.id != null ? String(ctx.user.id) : `guest:${ctx.ip}`;
}

const creatorIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(isCreatorAiId, { message: "Unknown AI assistant." });

const chatHistorySchema = z.array(
  z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(4000),
  }),
);

export const aiLearningRouter = router({
  /** Browse curriculum without login */
  getCurriculum: securePublicProcedure("aiLearning")
    .input(z.object({ creatorId: creatorIdSchema }))
    .query(({ ctx, input }) => {
      assertCanAccessOwnerAiLearning(input.creatorId, ctx.isPlatformOwner);
      const def = getCreatorAi(input.creatorId);
      if (!def) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI assistant not found." });
      }
      return {
        creatorId: def.id,
        creatorName: def.name,
        category: def.category,
        mission: def.mission,
        modules: getCurriculumForCreator(def),
        certification: getCertificationOverview(def),
        ...(isCoderTeachingCreator(def.id)
          ? {
              codingAcademy: true,
              selfPacedPaths: {
                beginner: getCoderSelfPacedPath("beginner"),
                intermediate: getCoderSelfPacedPath("intermediate"),
                advanced: getCoderSelfPacedPath("advanced"),
              },
              tagline: "Learn to code on your own — step by step, with hands-on exercises.",
            }
          : {}),
        ...(isGameTeachingCreator(def.id)
          ? {
              gameDevAcademy: true,
              selfPacedPaths: {
                beginner: getGameSelfPacedPath("beginner"),
                intermediate: getGameSelfPacedPath("intermediate"),
                advanced: getGameSelfPacedPath("advanced"),
              },
              tagline: "Learn game development on your own — from jam games to massive worlds.",
            }
          : {}),
        ...(isBlockchainTeachingCreator(def.id)
          ? {
              blockchainAcademy: true,
              selfPacedPaths: {
                beginner: getBlockchainSelfPacedPath("beginner"),
                intermediate: getBlockchainSelfPacedPath("intermediate"),
                advanced: getBlockchainSelfPacedPath("advanced"),
              },
              tagline: "Learn blockchain on your own — hashes, working chain code, and contract labs.",
            }
          : {}),
        ...(isMathTeachingCreator(def.id)
          ? {
              mathAcademy: true,
              selfPacedPaths: {
                beginner: getMathSelfPacedPath("beginner"),
                intermediate: getMathSelfPacedPath("intermediate"),
                advanced: getMathSelfPacedPath("advanced"),
              },
              tagline: "Learn mathematics — steps first, then speed. Not bookkeeping.",
            }
          : {}),
        ...(isReadingTeachingCreator(def.id)
          ? {
              readingAcademy: true,
              selfPacedPaths: {
                beginner: getReadingSelfPacedPath("beginner"),
                intermediate: getReadingSelfPacedPath("intermediate"),
                advanced: getReadingSelfPacedPath("advanced"),
              },
              tagline: "Learn to read — systematic phonics in the language you choose.",
            }
          : {}),
        ...(isBlueprintTeachingCreator(def.id)
          ? {
              blueprintAcademy: true,
              selfPacedPaths: {
                beginner: getBlueprintSelfPacedPath("beginner"),
                intermediate: getBlueprintSelfPacedPath("intermediate"),
                advanced: getBlueprintSelfPacedPath("advanced"),
              },
              tagline: "Learn to read any blueprint — any schematic type, any industry trend.",
            }
          : {}),
        ...(isCreativeTeachingCreator(def.id)
          ? {
              creativeAcademy: true,
              selfPacedPaths: {
                beginner: getCreativeSelfPacedPath(def.id, "beginner"),
                intermediate: getCreativeSelfPacedPath(def.id, "intermediate"),
                advanced: getCreativeSelfPacedPath(def.id, "advanced"),
              },
              tagline: getCreativeTeachingTagline(def.id),
            }
          : {}),
        ...(isLegalMasterTeachingCreator(def.id)
          ? {
              legalMastersAcademy: true,
              selfPacedPaths: {
                beginner: getLegalMasterSelfPacedPath(def.id, "beginner"),
                intermediate: getLegalMasterSelfPacedPath(def.id, "intermediate"),
                advanced: getLegalMasterSelfPacedPath(def.id, "advanced"),
              },
              tagline: getLegalMasterTeachingTagline(def.id),
            }
          : {}),
        ...(isOwnerBusinessTeachingCreator(def.id)
          ? {
              ownerOperatorAcademy: true,
              selfPacedPaths: {
                beginner: getOwnerBusinessSelfPacedPath("beginner"),
                intermediate: getOwnerBusinessSelfPacedPath("intermediate"),
                advanced: getOwnerBusinessSelfPacedPath("advanced"),
              },
              tagline: getOwnerBusinessTeachingTagline(),
            }
          : {}),
      };
    }),

  getProfile: securePublicProcedure("aiLearning")
    .input(z.object({ creatorId: creatorIdSchema }))
    .query(({ ctx, input }) => {
      assertCanAccessOwnerAiLearning(input.creatorId, ctx.isPlatformOwner);
      const def = getCreatorAi(input.creatorId);
      if (!def) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI assistant not found." });
      }
      const userId = resolveLearningUserId(ctx);
      const progress = getLearningProgress(userId, input.creatorId);
      const modules = getCurriculumForCreator(def);
      return {
        progress,
        modulesCompleted: progress.completedTopics.length,
        totalModules: modules.length,
        percentComplete:
          modules.length > 0
            ? Math.round((progress.completedTopics.length / modules.length) * 100)
            : 0,
      };
    }),

  setLevel: securePublicProcedure("aiLearning")
    .input(
      z.object({
        creatorId: creatorIdSchema,
        level: levelSchema,
      }),
    )
    .mutation(({ ctx, input }) => {
      assertCanAccessOwnerAiLearning(input.creatorId, ctx.isPlatformOwner);
      return updateLearningProgress(resolveLearningUserId(ctx), input.creatorId, {
        level: input.level,
      });
    }),

  teach: secureProcedure("aiLearning")
    .input(
      z.object({
        creatorId: creatorIdSchema,
        message: z.string().trim().min(1).max(4000),
        history: chatHistorySchema.max(20).optional(),
        level: levelSchema.default("beginner"),
        mode: modeSchema.default("lesson"),
        topic: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await handleCreatorLearningSession({
          creatorId: input.creatorId,
          message: input.message,
          history: input.history,
          level: input.level as LearningLevel,
          mode: input.mode as LearningMode,
          topic: input.topic,
          userId: String(ctx.user.id),
          userEmail: ctx.user.email,
          isPlatformOwner: ctx.isPlatformOwner,
        });
        recordUserActivity({
          userId: String(ctx.user.id),
          creatorId: input.creatorId,
          activityType: "learn",
        });
        return result;
      } catch (error) {
        throw mapServiceErrorToTrpc(error);
      }
    }),

  completeTopic: securePublicProcedure("aiLearning")
    .input(
      z.object({
        creatorId: creatorIdSchema,
        topic: z.string().min(1).max(200),
        mode: modeSchema.default("lesson"),
      }),
    )
    .mutation(({ ctx, input }) => {
      assertCanAccessOwnerAiLearning(input.creatorId, ctx.isPlatformOwner);
      return recordLessonComplete(
        resolveLearningUserId(ctx),
        input.creatorId,
        input.topic,
        input.mode,
      );
    }),

  getPracticeQuestions: securePublicProcedure("aiLearning")
    .input(
      z.object({
        creatorId: creatorIdSchema,
        count: z.number().int().min(1).max(10).default(5),
      }),
    )
    .query(({ ctx, input }) => {
      assertCanAccessOwnerAiLearning(input.creatorId, ctx.isPlatformOwner);
      const def = getCreatorAi(input.creatorId);
      if (!def) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI assistant not found." });
      }
      const modules = getCurriculumForCreator(def);
      const topics = modules.map((m) => m.title);

      if (isCoderTeachingCreator(input.creatorId)) {
        const exercises = getCoderPracticeExercises({ count: input.count });
        return {
          questions: exercises.map((ex) => ({
            id: ex.id,
            topic: ex.title,
            question: ex.prompt,
            level: ex.level,
            starterFile: ex.starterFile,
          })),
          disclaimer: "Educational coding practice — type code yourself in the Build sandbox.",
        };
      }

      if (isGameTeachingCreator(input.creatorId)) {
        const exercises = getGamePracticeExercises({ count: input.count });
        return {
          questions: exercises.map((ex) => ({
            id: ex.id,
            topic: ex.title,
            question: ex.prompt,
            level: ex.level,
            starterFile: ex.starterFile,
          })),
          disclaimer: "Educational game dev practice — build scripts and docs in the secure Build sandbox.",
        };
      }

      if (isBlockchainTeachingCreator(input.creatorId)) {
        const exercises = getBlockchainPracticeExercises({ count: input.count });
        return {
          questions: exercises.map((ex) => ({
            id: ex.id,
            topic: ex.title,
            question: ex.prompt,
            level: ex.level,
            starterFile: ex.starterFile,
          })),
          disclaimer: "Educational blockchain practice — write teaching-chain code in the Build sandbox.",
        };
      }

      if (isCreativeTeachingCreator(input.creatorId)) {
        const exercises = getCreativePracticeExercises({
          creatorId: input.creatorId,
          count: input.count,
        });
        return {
          questions: exercises.map((ex) => ({
            id: ex.id,
            topic: ex.title,
            question: ex.prompt,
            level: ex.level,
          })),
          disclaimer: "Educational creative practice — produce your own original work.",
        };
      }

      if (isLegalMasterTeachingCreator(input.creatorId)) {
        const exercises = getLegalMasterPracticeExercises({
          creatorId: input.creatorId,
          count: input.count,
        });
        return {
          questions: exercises.map((ex) => ({
            id: ex.id,
            topic: ex.title,
            question: ex.prompt,
            level: ex.level,
          })),
          disclaimer:
            "Educational legal practice only — not licensed representation. Consult a qualified attorney for your situation.",
        };
      }

      if (isOwnerBusinessTeachingCreator(input.creatorId)) {
        const exercises = getOwnerBusinessPracticeExercises({ count: input.count });
        return {
          questions: exercises.map((ex) => ({
            id: ex.id,
            topic: ex.title,
            question: ex.prompt,
            level: ex.level,
          })),
          disclaimer:
            "Educational operator practice only — not CPA, legal, or investment advice. Confirm filings and ads policy on official sites.",
        };
      }

      return {
        questions: createPracticeQuestionSet(def.name, topics, input.count),
        disclaimer: "Educational practice only — verify answers with qualified professionals.",
      };
    }),

  getCertificationPrep: securePublicProcedure("aiLearning")
    .input(z.object({ creatorId: creatorIdSchema }))
    .query(({ ctx, input }) => {
      assertCanAccessOwnerAiLearning(input.creatorId, ctx.isPlatformOwner);
      const def = getCreatorAi(input.creatorId);
      if (!def) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI assistant not found." });
      }
      return getCertificationOverview(def);
    }),
});
