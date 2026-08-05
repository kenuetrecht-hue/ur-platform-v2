/**
 * Autonomous forge agent — plan, propose patches, verify (Manus-style bounded loop).
 */

import { TRPCError } from "@trpc/server";
import { generateGoogleChatReply, isGoogleCloudAiConfigured } from "./google-ai";
import { getSandboxProject } from "./coder-sandbox-service";
import { getGameSandboxProject } from "./game-dev-sandbox-service";
import {
  applyForgePatches,
  buildPatchDiffs,
  parsePatchesFromAiReply,
  type ForgeFilePatch,
} from "./forge-patch-service";
import { executeSandboxBuild } from "./coder-sandbox-execution";
import { runSandboxTest } from "./coder-sandbox-service";
import { runGameSandboxTest, executeGameBuild } from "./game-dev-sandbox-service";
import { buildSandboxPreview } from "./forge-preview-service";
import { runForgePlaytestChecklist } from "./forge-playtest-service";

export type AgentStep = {
  step: number;
  action: string;
  summary: string;
  success: boolean;
};

export type ForgeAgentResult = {
  goal: string;
  steps: AgentStep[];
  patches?: ForgeFilePatch[];
  diffs?: ReturnType<typeof buildPatchDiffs>;
  reply: string;
  completed: boolean;
  previewAvailable: boolean;
};

const MAX_AGENT_STEPS = 5;

const AGENT_SYSTEM = `You are an autonomous build agent for UR Platform forge sandboxes.
You MUST respond with:
1. A brief human summary (2-4 sentences)
2. A JSON code block with patches when file changes are needed:

\`\`\`json
{"patches":[{"path":"relative/path","action":"create|update|delete","content":"file content"}],"nextAction":"test|preview|done"}
\`\`\`

Rules:
- Max 8 files per step. Educational builds only.
- Never include malware, cheats, DRM bypass, or credential theft.
- Use relative paths only. No .. traversal.
- When done, set nextAction to "done" and patches to [].
- For games: prefer Godot (.gd), Unity (.cs), or HTML5 (index.html + game.js).`;

export async function runForgeAgent(params: {
  specialist: "coder" | "game";
  userId: string;
  isPlatformOwner: boolean;
  projectId: string;
  goal: string;
  autoApply?: boolean;
}): Promise<ForgeAgentResult> {
  if (!isGoogleCloudAiConfigured()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "AI agent requires Google Cloud AI configuration.",
    });
  }

  const getProject = params.specialist === "game" ? getGameSandboxProject : getSandboxProject;
  const steps: AgentStep[] = [];
  let project = await getProject(params.userId, params.isPlatformOwner, params.projectId);
  let goal = params.goal.slice(0, 2000);
  let lastReply = "";
  let allPatches: ForgeFilePatch[] = [];

  for (let step = 1; step <= MAX_AGENT_STEPS; step++) {
    const fileList = project.files.map((f) => f.path).join(", ") || "(empty project)";
    const context = `Project: ${project.name}\nFramework: ${project.framework}\nFiles: ${fileList}\nGoal: ${goal}\nStep ${step}/${MAX_AGENT_STEPS}`;

    const result = await generateGoogleChatReply({
      systemPrompt: AGENT_SYSTEM,
      history: steps.map((s) => ({
        role: "assistant" as const,
        content: `Step ${s.step}: ${s.summary}`,
      })),
      message: context,
    });
    lastReply = result.reply;

    const patches = parsePatchesFromAiReply(result.reply);
    const nextActionMatch = result.reply.match(/"nextAction"\s*:\s*"(test|preview|done)"/);
    const nextAction = nextActionMatch?.[1] ?? (patches?.length ? "test" : "done");

    if (patches?.length) {
      allPatches = patches;
      if (params.autoApply) {
        const applied = await applyForgePatches({
          specialist: params.specialist,
          userId: params.userId,
          isPlatformOwner: params.isPlatformOwner,
          projectId: params.projectId,
          patches,
        });
        project = applied.project;
        steps.push({
          step,
          action: "apply_patches",
          summary: `Applied ${applied.applied.length} file change(s).`,
          success: true,
        });
      } else {
        steps.push({
          step,
          action: "propose_patches",
          summary: `Proposed ${patches.length} file change(s) — review and apply.`,
          success: true,
        });
        break;
      }
    } else {
      steps.push({
        step,
        action: "plan",
        summary: result.reply.slice(0, 300),
        success: true,
      });
    }

    if (nextAction === "test" && params.autoApply) {
      if (params.specialist === "game") {
        const test = await runGameSandboxTest({
          userId: params.userId,
          isPlatformOwner: params.isPlatformOwner,
          projectId: params.projectId,
        });
        steps.push({
          step,
          action: "test",
          summary: test.success ? "Security & structure tests passed." : `Issues: ${test.issues.join("; ")}`,
          success: test.success,
        });
        if (!test.success) goal = `Fix these issues: ${test.issues.join("; ")}`;
      } else {
        const test = await runSandboxTest({
          userId: params.userId,
          isPlatformOwner: params.isPlatformOwner,
          projectId: params.projectId,
        });
        steps.push({
          step,
          action: "test",
          summary: test.success ? "Structure tests passed." : `Issues: ${test.issues.join("; ")}`,
          success: test.success,
        });
      }
    }

    if (nextAction === "done") break;
    if (!params.autoApply && patches?.length) break;
  }

  project = await getProject(params.userId, params.isPlatformOwner, params.projectId);
  const preview = buildSandboxPreview(project);

  return {
    goal: params.goal,
    steps,
    patches: allPatches.length ? allPatches : undefined,
    diffs: allPatches.length ? buildPatchDiffs(project, allPatches) : undefined,
    reply: lastReply,
    completed: steps.some((s) => s.action === "plan" && s.summary.includes("done")) || steps.at(-1)?.action === "test",
    previewAvailable: preview.kind !== "none",
  };
}

export async function proposeForgePatches(params: {
  specialist: "coder" | "game";
  userId: string;
  isPlatformOwner: boolean;
  projectId: string;
  instruction: string;
}): Promise<{ reply: string; patches: ForgeFilePatch[]; diffs: ReturnType<typeof buildPatchDiffs> }> {
  if (!isGoogleCloudAiConfigured()) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "AI not configured." });
  }

  const getProject = params.specialist === "game" ? getGameSandboxProject : getSandboxProject;
  const project = await getProject(params.userId, params.isPlatformOwner, params.projectId);
  const fileSummary = project.files
    .slice(0, 30)
    .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 1500)}`)
    .join("\n\n");

  const result = await generateGoogleChatReply({
    systemPrompt: AGENT_SYSTEM,
    history: [],
    message: `Project: ${project.name}\nInstruction: ${params.instruction}\n\nExisting files:\n${fileSummary}`,
  });

  const patches = parsePatchesFromAiReply(result.reply) ?? [];
  return {
    reply: result.reply,
    patches,
    diffs: buildPatchDiffs(project, patches),
  };
}

export async function runForgeFullPipeline(params: {
  specialist: "coder" | "game";
  userId: string;
  isPlatformOwner: boolean;
  projectId: string;
}) {
  const getProject = params.specialist === "game" ? getGameSandboxProject : getSandboxProject;
  const project = await getProject(params.userId, params.isPlatformOwner, params.projectId);

  const test =
    params.specialist === "game"
      ? await runGameSandboxTest(params)
      : await runSandboxTest(params);

  const build =
    params.specialist === "game"
      ? await executeGameBuild(params)
      : executeSandboxBuild(project);

  const playtest = params.specialist === "game" ? runForgePlaytestChecklist(project) : null;
  const preview = buildSandboxPreview(project);

  return { test, build, playtest, preview };
}
