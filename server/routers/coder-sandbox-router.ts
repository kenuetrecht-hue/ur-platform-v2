import { z } from "zod";
import { secureProcedure, router, TRPCError } from "../_core/trpc";
import { assertAiEntitled } from "../_core/access-entitlements";
import {
  createSandboxProject,
  deleteSandboxFile,
  getSandboxProject,
  getSandboxStatus,
  listSandboxProjects,
  runSandboxTest,
  saveSandboxFile,
  upgradeSandboxTier,
  type SandboxTierId,
} from "../_core/coder-sandbox-service";
import { executeSandboxBuild } from "../_core/coder-sandbox-execution";
import {
  confirmSandboxUpgradePayment,
  createSandboxUpgradeCheckout,
} from "../_core/coder-sandbox-payments";
import {
  analyzeCoderFileContent,
  getCoderLearningStats,
  recordCoderBugFix,
  recordCoderPreferences,
} from "../_core/coder-learning-bridge";
import { UserDesignPreferencesSchema, CoderAIBugFixSchema } from "../coder-ai-learning-core";

const tierSchema = z.enum(["starter", "builder", "studio", "enterprise"]);

function assertSandboxAccess(ctx: {
  user: { id: unknown; email?: string | null; name?: string | null };
  isPlatformOwner: boolean;
}) {
  assertAiEntitled({
    userId: ctx.user.id,
    email: ctx.user.email,
    isPlatformOwner: ctx.isPlatformOwner,
    feature: "ai_sandbox",
  });
}

export const coderSandboxRouter = router({
  getStatus: secureProcedure("coderSandbox").query(async ({ ctx }) => {
    assertSandboxAccess(ctx);
    return {
      ...(await getSandboxStatus(String(ctx.user.id), ctx.isPlatformOwner)),
      learning: await getCoderLearningStats(String(ctx.user.id)),
    };
  }),

  listProjects: secureProcedure("coderSandbox").query(async ({ ctx }) => {
    assertSandboxAccess(ctx);
    return listSandboxProjects(String(ctx.user.id), ctx.isPlatformOwner);
  }),

  getProject: secureProcedure("coderSandbox")
    .input(z.object({ projectId: z.string().min(4).max(128) }))
    .query(async ({ ctx, input }) => {
      assertSandboxAccess(ctx);
      return getSandboxProject(String(ctx.user.id), ctx.isPlatformOwner, input.projectId);
    }),

  createProject: secureProcedure("coderSandbox")
    .input(
      z.object({
        name: z.string().min(1).max(120),
        description: z.string().max(2000).optional(),
        framework: z.string().max(64).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertSandboxAccess(ctx);
      return createSandboxProject({
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
        ...input,
      });
    }),

  saveFile: secureProcedure("coderSandbox")
    .input(
      z.object({
        projectId: z.string().min(4).max(128),
        path: z.string().min(1).max(512),
        content: z.string().max(5_000_000),
        persistToCloud: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertSandboxAccess(ctx);
      return saveSandboxFile({
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
        ...input,
      });
    }),

  deleteFile: secureProcedure("coderSandbox")
    .input(
      z.object({
        projectId: z.string().min(4).max(128),
        path: z.string().min(1).max(512),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertSandboxAccess(ctx);
      return deleteSandboxFile({
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
        ...input,
      });
    }),

  runTest: secureProcedure("coderSandbox")
    .input(z.object({ projectId: z.string().min(4).max(128) }))
    .mutation(async ({ ctx, input }) => {
      assertSandboxAccess(ctx);
      const result = await runSandboxTest({
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
        projectId: input.projectId,
      });
      if (result.success) {
        await recordCoderBugFix(String(ctx.user.id), {
          language: "typescript",
          bugFound: "sandbox_test",
          fixApplied: "all_checks_passed",
          userApproved: true,
          compilationSuccessful: true,
        });
      }
      return result;
    }),

  executeBuild: secureProcedure("coderSandbox")
    .input(z.object({ projectId: z.string().min(4).max(128) }))
    .mutation(async ({ ctx, input }) => {
      assertSandboxAccess(ctx);
      const project = await getSandboxProject(
        String(ctx.user.id),
        ctx.isPlatformOwner,
        input.projectId,
      );
      const report = executeSandboxBuild(project);
      if (report.success) {
        await recordCoderBugFix(String(ctx.user.id), {
          language: "typescript",
          bugFound: "sandbox_build",
          fixApplied: "build_simulation_passed",
          userApproved: true,
          compilationSuccessful: true,
        });
      }
      return report;
    }),

  upgradeTier: secureProcedure("coderSandbox")
    .input(z.object({ tier: tierSchema }))
    .mutation(async ({ ctx, input }) => {
      assertSandboxAccess(ctx);
      if (!ctx.isPlatformOwner && input.tier !== "starter") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Use createUpgradeCheckout for paid tier upgrades.",
        });
      }
      return upgradeSandboxTier({
        userId: String(ctx.user.id),
        targetTier: input.tier as SandboxTierId,
        isPlatformOwner: ctx.isPlatformOwner,
        actingAsOwner: ctx.isPlatformOwner,
      });
    }),

  createUpgradeCheckout: secureProcedure("coderSandbox")
    .input(z.object({ tier: tierSchema }))
    .mutation(async ({ ctx, input }) => {
      assertSandboxAccess(ctx);
      return createSandboxUpgradeCheckout({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
        userName: ctx.user.name ?? "UR User",
        targetTier: input.tier as SandboxTierId,
        isPlatformOwner: ctx.isPlatformOwner,
      });
    }),

  confirmUpgradePayment: secureProcedure("coderSandbox")
    .input(
      z.object({
        paymentIntentId: z.string().min(4).max(128),
        paymentMethodId: z.string().max(128).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertSandboxAccess(ctx);
      return confirmSandboxUpgradePayment({
        userId: String(ctx.user.id),
        paymentIntentId: input.paymentIntentId,
        paymentMethodId: input.paymentMethodId,
        isPlatformOwner: ctx.isPlatformOwner,
      });
    }),

  ownerGrantTier: secureProcedure("coderSandbox")
    .input(
      z.object({
        userEmail: z.string().email(),
        tier: tierSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.isPlatformOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Platform owner only." });
      }
      return upgradeSandboxTier({
        userId: String(ctx.user.id),
        targetTier: input.tier as SandboxTierId,
        isPlatformOwner: true,
        actingAsOwner: true,
      });
    }),

  savePreferences: secureProcedure("coderSandbox")
    .input(UserDesignPreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      assertSandboxAccess(ctx);
      return recordCoderPreferences(String(ctx.user.id), input);
    }),

  analyzeFile: secureProcedure("coderSandbox")
    .input(
      z.object({
        content: z.string().max(500_000),
        language: z.enum(["typescript", "javascript", "html", "css", "tsx", "jsx"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertSandboxAccess(ctx);
      return analyzeCoderFileContent(String(ctx.user.id), input.content, input.language);
    }),

  recordBugFix: secureProcedure("coderSandbox")
    .input(CoderAIBugFixSchema)
    .mutation(async ({ ctx, input }) => {
      assertSandboxAccess(ctx);
      return recordCoderBugFix(String(ctx.user.id), input);
    }),
});
