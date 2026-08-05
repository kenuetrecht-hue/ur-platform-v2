import { z } from "zod";
import { secureProcedure, router, TRPCError } from "../_core/trpc";
import { assertAiEntitled } from "../_core/access-entitlements";
import { listForgeTemplates, FORGE_TEMPLATES, type ForgeTemplateId } from "../_core/forge-templates";
import { applyForgePatches, buildPatchDiffs, type ForgeFilePatch } from "../_core/forge-patch-service";
import {
  runForgeAgent,
  proposeForgePatches,
  runForgeFullPipeline,
} from "../_core/forge-agent-service";
import { buildSandboxPreview } from "../_core/forge-preview-service";
import {
  connectForgeGitHub,
  getForgeGitHubStatus,
  pullForgeFromGitHub,
  pushForgeToGitHub,
} from "../_core/forge-github-service";
import { generateCiConfig, runForgePlaytestChecklist } from "../_core/forge-playtest-service";
import { assessDeployReadiness } from "../_core/forge-deploy-readiness";
import {
  listForgeSessionStatus,
  destroyAllSessionsForUser,
} from "../_core/forge-session-manager";
import {
  runEphemeralCloudExecution,
  endForgeCloudSession,
} from "../_core/forge-execution-runtime";
import { buildProjectZip } from "../_core/forge-export-service";
import { generateDeployWizard, listDeployTargets, type DeployTarget } from "../_core/forge-deploy-wizards";
import { getHiveAssetPack, listHiveAssetPacks } from "../_core/forge-hive-assets";
import { createShareLink, revokeShareLink } from "../_core/forge-share-service";
import { createSandboxProject, saveSandboxFile, getSandboxProject } from "../_core/coder-sandbox-service";
import { createGameSandboxProject, saveGameSandboxFile, getGameSandboxProject } from "../_core/game-dev-sandbox-service";

const specialistSchema = z.enum(["coder", "game"]);
const templateIdSchema = z.enum([
  "expo-app",
  "expo-mobile-game",
  "next-trpc",
  "godot-2d",
  "unity-2d",
  "html5-game",
  "multiplayer-starter",
]);

const TECH_BUILDER_ID = "ai-coder-001";
const GAME_FORGE_ID = "ai-game-dev-001";

function resolveSpecialist(creatorId: string): "coder" | "game" {
  if (creatorId === TECH_BUILDER_ID) return "coder";
  if (creatorId === GAME_FORGE_ID) return "game";
  throw new TRPCError({ code: "BAD_REQUEST", message: "Forge tools require TechBuilder or GameForge." });
}

function assertForgeAccess(ctx: {
  user: { id: unknown; email?: string | null };
  isPlatformOwner: boolean;
}) {
  assertAiEntitled({
    userId: ctx.user.id,
    email: ctx.user.email,
    isPlatformOwner: ctx.isPlatformOwner,
    feature: "ai_sandbox",
  });
}

const patchSchema = z.object({
  path: z.string().min(1).max(512),
  action: z.enum(["create", "update", "delete"]),
  content: z.string().max(500_000).optional(),
});

export const forgeAgentRouter = router({
  listTemplates: secureProcedure("forgeAgent")
    .input(z.object({ specialist: specialistSchema }))
    .query(({ input }) => listForgeTemplates(input.specialist)),

  applyTemplate: secureProcedure("forgeAgent")
    .input(
      z.object({
        specialist: specialistSchema,
        templateId: templateIdSchema,
        projectName: z.string().min(1).max(120),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      const userId = String(ctx.user.id);
      const template = FORGE_TEMPLATES[input.templateId as ForgeTemplateId];

      const create =
        input.specialist === "game" ? createGameSandboxProject : createSandboxProject;
      const save = input.specialist === "game" ? saveGameSandboxFile : saveSandboxFile;

      const project = await create({
        userId,
        isPlatformOwner: ctx.isPlatformOwner,
        name: input.projectName,
        ...(input.specialist === "game"
          ? { engine: template.engine ?? template.label }
          : { framework: template.framework ?? template.label }),
      });

      for (const file of template.files) {
        await save({
          userId,
          isPlatformOwner: ctx.isPlatformOwner,
          projectId: project.id,
          path: file.path,
          content: file.content,
          persistToCloud: true,
        });
      }

      return { projectId: project.id, filesCreated: template.files.length, template: template.label };
    }),

  proposePatches: secureProcedure("forgeAgent")
    .input(
      z.object({
        creatorId: z.string(),
        projectId: z.string(),
        instruction: z.string().min(1).max(4000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      const specialist = resolveSpecialist(input.creatorId);
      return proposeForgePatches({
        specialist,
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
        projectId: input.projectId,
        instruction: input.instruction,
      });
    }),

  applyPatches: secureProcedure("forgeAgent")
    .input(
      z.object({
        creatorId: z.string(),
        projectId: z.string(),
        patches: z.array(patchSchema).min(1).max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      const specialist = resolveSpecialist(input.creatorId);
      return applyForgePatches({
        specialist,
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
        projectId: input.projectId,
        patches: input.patches as ForgeFilePatch[],
      });
    }),

  previewDiffs: secureProcedure("forgeAgent")
    .input(
      z.object({
        creatorId: z.string(),
        projectId: z.string(),
        patches: z.array(patchSchema).min(1).max(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      const specialist = resolveSpecialist(input.creatorId);
      const getProject = specialist === "game" ? getGameSandboxProject : getSandboxProject;
      const project = await getProject(String(ctx.user.id), ctx.isPlatformOwner, input.projectId);
      return buildPatchDiffs(project, input.patches as ForgeFilePatch[]);
    }),

  runAgent: secureProcedure("forgeAgent")
    .input(
      z.object({
        creatorId: z.string(),
        projectId: z.string(),
        goal: z.string().min(1).max(2000),
        autoApply: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      const specialist = resolveSpecialist(input.creatorId);
      return runForgeAgent({
        specialist,
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
        projectId: input.projectId,
        goal: input.goal,
        autoApply: input.autoApply,
      });
    }),

  getPreview: secureProcedure("forgeAgent")
    .input(z.object({ creatorId: z.string(), projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      const specialist = resolveSpecialist(input.creatorId);
      const getProject = specialist === "game" ? getGameSandboxProject : getSandboxProject;
      const project = await getProject(String(ctx.user.id), ctx.isPlatformOwner, input.projectId);
      return buildSandboxPreview(project);
    }),

  runPipeline: secureProcedure("forgeAgent")
    .input(z.object({ creatorId: z.string(), projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      const specialist = resolveSpecialist(input.creatorId);
      return runForgeFullPipeline({
        specialist,
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
        projectId: input.projectId,
      });
    }),

  generateCi: secureProcedure("forgeAgent")
    .input(z.object({ creatorId: z.string(), projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      const specialist = resolveSpecialist(input.creatorId);
      const getProject = specialist === "game" ? getGameSandboxProject : getSandboxProject;
      const project = await getProject(String(ctx.user.id), ctx.isPlatformOwner, input.projectId);
      const ci = generateCiConfig({ specialist, project });
      const save = specialist === "game" ? saveGameSandboxFile : saveSandboxFile;
      await save({
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
        projectId: input.projectId,
        path: ci.path,
        content: ci.content,
        persistToCloud: true,
      });
      return ci;
    }),

  playtestChecklist: secureProcedure("forgeAgent")
    .input(z.object({ creatorId: z.string(), projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      resolveSpecialist(input.creatorId);
      const project = await getGameSandboxProject(
        String(ctx.user.id),
        ctx.isPlatformOwner,
        input.projectId,
      );
      return runForgePlaytestChecklist(project);
    }),

  githubStatus: secureProcedure("forgeAgent")
    .input(z.object({ specialist: specialistSchema }))
    .query(({ ctx, input }) => {
      assertForgeAccess(ctx);
      return getForgeGitHubStatus(String(ctx.user.id), input.specialist);
    }),

  githubConnect: secureProcedure("forgeAgent")
    .input(
      z.object({
        specialist: specialistSchema,
        owner: z.string().min(1).max(100),
        repo: z.string().min(1).max(100),
        token: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      return connectForgeGitHub({
        userId: String(ctx.user.id),
        specialist: input.specialist,
        owner: input.owner,
        repo: input.repo,
        token: input.token,
      });
    }),

  githubPull: secureProcedure("forgeAgent")
    .input(
      z.object({
        specialist: specialistSchema,
        projectId: z.string(),
        paths: z.array(z.string()).max(20).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      const userId = String(ctx.user.id);
      const files = await pullForgeFromGitHub({
        userId,
        specialist: input.specialist,
        paths: input.paths,
      });
      const save = input.specialist === "game" ? saveGameSandboxFile : saveSandboxFile;
      for (const file of files) {
        await save({
          userId,
          isPlatformOwner: ctx.isPlatformOwner,
          projectId: input.projectId,
          path: file.path,
          content: file.content,
          persistToCloud: true,
        });
      }
      return { imported: files.length, paths: files.map((f) => f.path) };
    }),

  githubPush: secureProcedure("forgeAgent")
    .input(
      z.object({
        specialist: specialistSchema,
        path: z.string().min(1).max(512),
        projectId: z.string(),
        message: z.string().min(1).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      const specialist = input.specialist;
      const getProject = specialist === "game" ? getGameSandboxProject : getSandboxProject;
      const project = await getProject(String(ctx.user.id), ctx.isPlatformOwner, input.projectId);
      const file = project.files.find((f) => f.path === input.path);
      if (!file) throw new TRPCError({ code: "NOT_FOUND", message: "File not in sandbox." });
      return pushForgeToGitHub({
        userId: String(ctx.user.id),
        specialist,
        files: [{ path: file.path, content: file.content }],
        message: input.message,
      });
    }),

  analyzeVisual: secureProcedure("forgeAgent")
    .input(
      z.object({
        creatorId: z.string(),
        projectId: z.string(),
        description: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      const specialist = resolveSpecialist(input.creatorId);
      const result = await proposeForgePatches({
        specialist,
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
        projectId: input.projectId,
        instruction: `Visual / UI feedback from user: ${input.description}. Suggest concrete file patches to fix layout, colors, or UX.`,
      });
      return result;
    }),

  getSessionStatus: secureProcedure("forgeAgent")
    .input(z.object({ specialist: specialistSchema }))
    .query(({ ctx, input }) => {
      assertForgeAccess(ctx);
      return listForgeSessionStatus(String(ctx.user.id), input.specialist);
    }),

  runCloudExecution: secureProcedure("forgeAgent")
    .input(
      z.object({
        creatorId: z.string(),
        projectId: z.string(),
        destroySessionAfter: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      const specialist = resolveSpecialist(input.creatorId);
      const getProject = specialist === "game" ? getGameSandboxProject : getSandboxProject;
      const project = await getProject(String(ctx.user.id), ctx.isPlatformOwner, input.projectId);
      return runEphemeralCloudExecution({
        userId: String(ctx.user.id),
        specialist,
        project,
        destroySessionAfter: input.destroySessionAfter,
      });
    }),

  endCloudSession: secureProcedure("forgeAgent")
    .input(
      z.object({
        sessionId: z.string().min(1).max(64),
        wipeCloudArtifacts: z.boolean().default(true),
        disconnectGitHub: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      return endForgeCloudSession({
        sessionId: input.sessionId,
        wipeCloudArtifacts: input.wipeCloudArtifacts,
        disconnectGitHub: input.disconnectGitHub,
      });
    }),

  endAllSessions: secureProcedure("forgeAgent")
    .mutation(async ({ ctx }) => {
      assertForgeAccess(ctx);
      const destroyed = await destroyAllSessionsForUser(String(ctx.user.id));
      return { destroyed, message: "All forge cloud workspaces wiped from server." };
    }),

  deployReadiness: secureProcedure("forgeAgent")
    .input(z.object({ creatorId: z.string(), projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      const specialist = resolveSpecialist(input.creatorId);
      const getProject = specialist === "game" ? getGameSandboxProject : getSandboxProject;
      const project = await getProject(String(ctx.user.id), ctx.isPlatformOwner, input.projectId);
      return assessDeployReadiness({ specialist, project });
    }),

  exportZip: secureProcedure("forgeAgent")
    .input(z.object({ creatorId: z.string(), projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      const specialist = resolveSpecialist(input.creatorId);
      const getProject = specialist === "game" ? getGameSandboxProject : getSandboxProject;
      const project = await getProject(String(ctx.user.id), ctx.isPlatformOwner, input.projectId);
      return buildProjectZip(project);
    }),

  listDeployTargets: secureProcedure("forgeAgent")
    .input(z.object({ specialist: specialistSchema }))
    .query(({ input }) => listDeployTargets(input.specialist)),

  applyDeployWizard: secureProcedure("forgeAgent")
    .input(
      z.object({
        creatorId: z.string(),
        projectId: z.string(),
        target: z.enum([
          "expo-eas",
          "apple-app-store",
          "google-play-store",
          "vercel",
          "itch-io",
          "github-pages",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      const specialist = resolveSpecialist(input.creatorId);
      const getProject = specialist === "game" ? getGameSandboxProject : getSandboxProject;
      const project = await getProject(String(ctx.user.id), ctx.isPlatformOwner, input.projectId);
      const wizard = generateDeployWizard({
        target: input.target as DeployTarget,
        project,
        specialist,
      });
      const save = specialist === "game" ? saveGameSandboxFile : saveSandboxFile;
      for (const file of wizard.files) {
        await save({
          userId: String(ctx.user.id),
          isPlatformOwner: ctx.isPlatformOwner,
          projectId: input.projectId,
          path: file.path,
          content: file.content,
          persistToCloud: true,
        });
      }
      return wizard;
    }),

  listHiveAssetPacks: secureProcedure("forgeAgent")
    .input(z.object({ specialist: specialistSchema }))
    .query(({ input }) => listHiveAssetPacks(input.specialist)),

  importHiveAssetPack: secureProcedure("forgeAgent")
    .input(
      z.object({
        creatorId: z.string(),
        projectId: z.string(),
        packId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      const specialist = resolveSpecialist(input.creatorId);
      const pack = getHiveAssetPack(input.packId);
      if (!pack) throw new TRPCError({ code: "NOT_FOUND", message: "Asset pack not found." });
      const save = specialist === "game" ? saveGameSandboxFile : saveSandboxFile;
      for (const file of pack.files) {
        await save({
          userId: String(ctx.user.id),
          isPlatformOwner: ctx.isPlatformOwner,
          projectId: input.projectId,
          path: file.path,
          content: file.content,
          persistToCloud: true,
        });
      }
      return { imported: pack.files.length, label: pack.label, sourceAi: pack.sourceAi };
    }),

  createShareLink: secureProcedure("forgeAgent")
    .input(z.object({ creatorId: z.string(), projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertForgeAccess(ctx);
      resolveSpecialist(input.creatorId);
      const getProject =
        resolveSpecialist(input.creatorId) === "game" ? getGameSandboxProject : getSandboxProject;
      const project = await getProject(String(ctx.user.id), ctx.isPlatformOwner, input.projectId);
      return createShareLink({ userId: String(ctx.user.id), project });
    }),

  revokeShareLink: secureProcedure("forgeAgent")
    .input(z.object({ token: z.string() }))
    .mutation(({ ctx, input }) => {
      assertForgeAccess(ctx);
      const ok = revokeShareLink(String(ctx.user.id), input.token);
      if (!ok) throw new TRPCError({ code: "NOT_FOUND", message: "Share link not found." });
      return { ok: true as const };
    }),
});
