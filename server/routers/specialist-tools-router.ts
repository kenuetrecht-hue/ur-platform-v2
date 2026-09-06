/**
 * Specialist job tools — authenticated, namespaced, Zod-validated.
 * GitHub import is read-only. CNC send never auto-starts. Legal routes stamp "not your lawyer".
 */

import { z } from "zod";
import { secureProcedure, router, TRPCError } from "../_core/trpc";
import { assertAiEntitled } from "../_core/access-entitlements";
import { assertSectionEnabledForRequest } from "../_core/platform-section-guard";
import { assertUserIsAgeVerified } from "../_core/age-kyc-service";
import { sanitizeUserText } from "../_core/input-sanitize";
import {
  LEGAL_CONTRACT_SPECIALIST_IDS,
  LEGAL_SPECIALIST_IDS,
  STORY_SPECIALIST_IDS,
  RHYME_SPECIALIST_IDS,
  FORGE_TOOL_SPECIALIST_IDS,
  SHOP_EXPORT_SPECIALIST_IDS,
  CNC_SEND_SPECIALIST_IDS,
  PRINT_SPECIALIST_IDS,
  US_STATES,
  specialistToolKinds,
} from "../../lib/specialist-job-tools";
import {
  checkShopExport,
  expandOwnedChapter,
  importPublicGithubRepo,
  layoutFountain,
  listStoryBibles,
  previewSandboxDiffs,
  printableDraft,
  reviewContractMarkup,
  reviewDocumentCompare,
  rhymeHelp,
  runSandboxTestLoop,
  scoreOwnedSpokenDrill,
  searchPublicLaw,
  sendShopFileUserMustStart,
  upsertStoryBible,
  type ForgeToolSpecialist,
} from "../_core/specialist-job-tools-service";

const creatorIdSchema = z.string().trim().min(2).max(64);
const stateCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Use a two-letter US state or DC code.");

const patchSchema = z.object({
  path: z.string().trim().min(1).max(512),
  action: z.enum(["create", "update", "delete"]),
  content: z.string().max(500_000).optional(),
});

async function assertSignedInFeature(
  ctx: { user: { id: unknown; email?: string | null }; isPlatformOwner: boolean },
  feature: "ai_chat" | "ai_sandbox" | "ai_learn",
  creatorId?: string,
) {
  if (!ctx.isPlatformOwner) {
    await assertUserIsAgeVerified(String(ctx.user.id));
  }
  assertAiEntitled({
    userId: String(ctx.user.id),
    email: ctx.user.email,
    isPlatformOwner: ctx.isPlatformOwner,
    feature,
    creatorId,
  });
}

function assertCreatorAllowed(creatorId: string, allowed: readonly string[]): void {
  if (!allowed.includes(creatorId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This tool is not available on this specialist." });
  }
}

function forgeSpecialistFromCreator(creatorId: string): ForgeToolSpecialist {
  return creatorId === "ai-game-dev-001" ? "game" : "coder";
}

const characterSchema = z.object({
  name: z.string().trim().max(80),
  role: z.string().trim().max(80),
  notes: z.string().trim().max(400),
});

const locationSchema = z.object({
  name: z.string().trim().max(80),
  notes: z.string().trim().max(400),
});

const chapterSchema = z.object({
  id: z.string().trim().max(40).optional(),
  title: z.string().trim().max(120),
  summary: z.string().trim().max(800),
});

export const specialistToolsRouter = router({
  catalog: secureProcedure("ai")
    .input(z.object({ creatorId: creatorIdSchema }))
    .query(({ input }) => ({
      creatorId: input.creatorId,
      kinds: specialistToolKinds(input.creatorId),
      states: US_STATES,
    })),

  previewDiff: secureProcedure("coderSandbox")
    .input(
      z.object({
        creatorId: z.enum(FORGE_TOOL_SPECIALIST_IDS),
        files: z
          .array(z.object({ path: z.string().trim().min(1).max(512), content: z.string().max(200_000) }))
          .max(40),
        patches: z.array(patchSchema).min(1).max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertSectionEnabledForRequest("forge_sandbox", ctx.isPlatformOwner);
      await assertSignedInFeature(ctx, "ai_sandbox", input.creatorId);
      return previewSandboxDiffs({
        specialist: forgeSpecialistFromCreator(input.creatorId),
        files: input.files,
        patches: input.patches,
      });
    }),

  runTestLoop: secureProcedure("coderSandbox")
    .input(
      z.object({
        creatorId: z.enum(FORGE_TOOL_SPECIALIST_IDS),
        projectId: z.string().min(4).max(128),
        patches: z.array(patchSchema).max(20).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertSectionEnabledForRequest("forge_sandbox", ctx.isPlatformOwner);
      await assertSignedInFeature(ctx, "ai_sandbox", input.creatorId);
      try {
        return await runSandboxTestLoop({
          specialist: forgeSpecialistFromCreator(input.creatorId),
          userId: String(ctx.user.id),
          isPlatformOwner: ctx.isPlatformOwner,
          projectId: input.projectId,
          patches: input.patches,
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Test loop failed.",
        });
      }
    }),

  importPublicGithub: secureProcedure("coderSandbox")
    .input(
      z.object({
        creatorId: z.enum(FORGE_TOOL_SPECIALIST_IDS),
        projectId: z.string().min(4).max(128),
        repoUrl: z.string().trim().url().max(300),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertSectionEnabledForRequest("forge_sandbox", ctx.isPlatformOwner);
      await assertSignedInFeature(ctx, "ai_sandbox", input.creatorId);
      try {
        return await importPublicGithubRepo({
          specialist: forgeSpecialistFromCreator(input.creatorId),
          userId: String(ctx.user.id),
          isPlatformOwner: ctx.isPlatformOwner,
          projectId: input.projectId,
          repoUrl: input.repoUrl,
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "GitHub import failed.",
        });
      }
    }),

  searchPublicLaw: secureProcedure("webSearch")
    .input(
      z.object({
        creatorId: z.enum(LEGAL_SPECIALIST_IDS),
        query: z.string().trim().min(2).max(180),
        stateCode: stateCodeSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertSignedInFeature(ctx, "ai_chat", input.creatorId);
      return searchPublicLaw({
        query: input.query,
        stateCode: input.stateCode,
      });
    }),

  markupContract: secureProcedure("ai")
    .input(
      z.object({
        creatorId: z.enum(LEGAL_CONTRACT_SPECIALIST_IDS),
        text: z.string().trim().min(8).max(20_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertSignedInFeature(ctx, "ai_chat", input.creatorId);
      return reviewContractMarkup(input.text);
    }),

  compareDocuments: secureProcedure("ai")
    .input(
      z.object({
        creatorId: z.enum(LEGAL_CONTRACT_SPECIALIST_IDS),
        left: z.string().trim().min(1).max(20_000),
        right: z.string().trim().min(1).max(20_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertSignedInFeature(ctx, "ai_chat", input.creatorId);
      return reviewDocumentCompare(input.left, input.right);
    }),

  listStoryBibles: secureProcedure("ai")
    .input(z.object({ creatorId: z.enum(STORY_SPECIALIST_IDS) }))
    .query(async ({ ctx, input }) => {
      await assertSignedInFeature(ctx, "ai_chat", input.creatorId);
      return listStoryBibles(String(ctx.user.id), input.creatorId);
    }),

  saveStoryBible: secureProcedure("ai")
    .input(
      z.object({
        creatorId: z.enum(STORY_SPECIALIST_IDS),
        bibleId: z.string().trim().max(64).optional(),
        title: z.string().trim().min(1).max(120),
        logline: z.string().trim().max(400).default(""),
        characters: z.array(characterSchema).max(20).default([]),
        locations: z.array(locationSchema).max(20).default([]),
        chapters: z.array(chapterSchema).max(40).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertSignedInFeature(ctx, "ai_chat", input.creatorId);
      return upsertStoryBible({
        userId: String(ctx.user.id),
        creatorId: input.creatorId,
        bibleId: input.bibleId,
        draft: {
          title: input.title,
          logline: input.logline,
          characters: input.characters,
          locations: input.locations,
          chapters: input.chapters.map((c, i) => ({
            id: c.id || `ch-${i + 1}`,
            title: c.title,
            summary: c.summary,
          })),
        },
      });
    }),

  expandChapter: secureProcedure("ai")
    .input(
      z.object({
        creatorId: z.enum(STORY_SPECIALIST_IDS),
        bibleId: z.string().trim().min(4).max(64),
        chapterId: z.string().trim().min(1).max(40),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertSignedInFeature(ctx, "ai_chat", input.creatorId);
      return expandOwnedChapter(String(ctx.user.id), input.bibleId, input.chapterId);
    }),

  formatFountain: secureProcedure("ai")
    .input(
      z.object({
        creatorId: z.enum(STORY_SPECIALIST_IDS),
        source: z.string().trim().min(1).max(20_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertSignedInFeature(ctx, "ai_chat", input.creatorId);
      return layoutFountain(input.source);
    }),

  rhymeHelper: secureProcedure("ai")
    .input(
      z.object({
        creatorId: z.enum(RHYME_SPECIALIST_IDS),
        word: z.string().trim().min(1).max(40),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertSignedInFeature(ctx, "ai_chat", input.creatorId);
      return rhymeHelp(input.word);
    }),

  printableDraft: secureProcedure("ai")
    .input(
      z.object({
        creatorId: z.string().trim().min(2).max(64),
        title: z.string().trim().min(1).max(120),
        body: z.string().trim().min(1).max(40_000),
        creatorName: z.string().trim().max(80).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCreatorAllowed(input.creatorId, PRINT_SPECIALIST_IDS);
      await assertSignedInFeature(ctx, "ai_chat", input.creatorId);
      const legal = (LEGAL_SPECIALIST_IDS as readonly string[]).includes(input.creatorId);
      return printableDraft({
        title: input.title,
        body: input.body,
        legal,
        creatorName: input.creatorName ? sanitizeUserText(input.creatorName, 80) : undefined,
      });
    }),

  checkShopExport: secureProcedure("equipment")
    .input(
      z.object({
        creatorId: z.enum(SHOP_EXPORT_SPECIALIST_IDS),
        fileName: z.string().trim().min(1).max(255),
        fileContentBase64: z.string().min(8).max(16_000_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertSignedInFeature(ctx, "ai_chat", input.creatorId);
      return checkShopExport(input.fileName, input.fileContentBase64);
    }),

  sendShopFile: secureProcedure("equipment")
    .input(
      z.object({
        creatorId: z.enum(CNC_SEND_SPECIALIST_IDS),
        connectionId: z.string().min(4).max(128),
        fileName: z.string().trim().min(1).max(255),
        fileContentBase64: z.string().min(8).max(12_000_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertSignedInFeature(ctx, "ai_chat", input.creatorId);
      try {
        return await sendShopFileUserMustStart({
          userId: String(ctx.user.id),
          connectionId: input.connectionId,
          fileName: input.fileName,
          fileContentBase64: input.fileContentBase64,
          startPrint: false,
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Could not send the file.",
        });
      }
    }),

  scoreSpokenDrill: secureProcedure("aiLanguage")
    .input(
      z.object({
        expected: z.string().trim().min(1).max(400),
        transcript: z.string().trim().min(1).max(400),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertSignedInFeature(ctx, "ai_chat", "linguamate");
      return scoreOwnedSpokenDrill(input.expected, input.transcript);
    }),
});
