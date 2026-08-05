import { z } from "zod";
import { secureProcedure, securePublicProcedure, router, TRPCError } from "../_core/trpc";
import { getCreatorAi, isCreatorAiId } from "../_core/ai-creator-registry";
import {
  getCertificationOverview,
  getCurriculumForCreator,
  handleCreatorLearningSession,
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
  getBlueprintSelfPacedPath,
  isBlueprintTeachingCreator,
} from "../_core/blueprint-teaching-curriculum";
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
    .query(({ input }) => {
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
      };
    }),

  getProfile: securePublicProcedure("aiLearning")
    .input(z.object({ creatorId: creatorIdSchema }))
    .query(({ ctx, input }) => {
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
    .query(({ input }) => {
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

      return {
        questions: createPracticeQuestionSet(def.name, topics, input.count),
        disclaimer: "Educational practice only — verify answers with qualified professionals.",
      };
    }),

  getCertificationPrep: securePublicProcedure("aiLearning")
    .input(z.object({ creatorId: creatorIdSchema }))
    .query(({ input }) => {
      const def = getCreatorAi(input.creatorId);
      if (!def) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI assistant not found." });
      }
      return getCertificationOverview(def);
    }),
});
