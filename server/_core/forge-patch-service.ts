/**
 * Secure file patches for forge sandboxes — diff, validate, apply.
 */

import { TRPCError } from "@trpc/server";
import { assertGameSandboxFileSecure } from "./game-dev-security";
import { saveSandboxFile, getSandboxProject, deleteSandboxFile, type SandboxProject } from "./coder-sandbox-service";
import { saveGameSandboxFile, getGameSandboxProject, deleteGameSandboxFile } from "./game-dev-sandbox-service";

export type PatchAction = "create" | "update" | "delete";

export type ForgeFilePatch = {
  path: string;
  action: PatchAction;
  content?: string;
};

export type PatchDiff = {
  path: string;
  action: PatchAction;
  before?: string;
  after?: string;
  linesAdded: number;
  linesRemoved: number;
};

function assertCoderPathSafe(path: string, content: string): void {
  if (path.includes("..") || path.startsWith("/")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Invalid file path." });
  }
  const blocked = [/child_process/i, /eval\s*\(/i, /new\s+Function/i];
  for (const p of blocked) {
    if (p.test(content)) {
      throw new TRPCError({ code: "FORBIDDEN", message: `Blocked unsafe pattern in ${path}` });
    }
  }
}

function validatePatch(specialist: "coder" | "game", patch: ForgeFilePatch): void {
  const path = patch.path.replace(/^\/+/, "").slice(0, 512);
  if (!path) throw new TRPCError({ code: "BAD_REQUEST", message: "Patch path required." });
  if (patch.action !== "delete") {
    if (patch.content == null) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Content required for ${patch.action} on ${path}` });
    }
    if (specialist === "game") {
      assertGameSandboxFileSecure(path, patch.content);
    } else {
      assertCoderPathSafe(path, patch.content);
    }
  }
}

export function buildPatchDiffs(project: SandboxProject, patches: ForgeFilePatch[]): PatchDiff[] {
  return patches.map((patch) => {
    const path = patch.path.replace(/^\/+/, "");
    const existing = project.files.find((f) => f.path === path);
    const before = existing?.content;
    const after = patch.action === "delete" ? undefined : patch.content;
    const beforeLines = before?.split(/\r?\n/).length ?? 0;
    const afterLines = after?.split(/\r?\n/).length ?? 0;
    return {
      path,
      action: patch.action,
      before,
      after,
      linesAdded: Math.max(0, afterLines - (patch.action === "create" ? 0 : beforeLines)),
      linesRemoved: Math.max(0, beforeLines - (patch.action === "delete" ? beforeLines : afterLines)),
    };
  });
}

export async function applyForgePatches(params: {
  specialist: "coder" | "game";
  userId: string;
  isPlatformOwner: boolean;
  projectId: string;
  patches: ForgeFilePatch[];
}): Promise<{ applied: string[]; project: SandboxProject }> {
  const getProject =
    params.specialist === "game" ? getGameSandboxProject : getSandboxProject;
  const saveFile = params.specialist === "game" ? saveGameSandboxFile : saveSandboxFile;
  const deleteFile = params.specialist === "game" ? deleteGameSandboxFile : deleteSandboxFile;

  let project = await getProject(params.userId, params.isPlatformOwner, params.projectId);
  const applied: string[] = [];

  for (const patch of params.patches) {
    validatePatch(params.specialist, patch);
    const path = patch.path.replace(/^\/+/, "");

    if (patch.action === "delete") {
      await deleteFile({
        userId: params.userId,
        isPlatformOwner: params.isPlatformOwner,
        projectId: params.projectId,
        path,
      });
      applied.push(`deleted:${path}`);
      continue;
    }

    await saveFile({
      userId: params.userId,
      isPlatformOwner: params.isPlatformOwner,
      projectId: params.projectId,
      path,
      content: patch.content!,
      persistToCloud: true,
    });
    applied.push(`${patch.action}:${path}`);
  }

  project = await getProject(params.userId, params.isPlatformOwner, params.projectId);
  return { applied, project };
}

/** Extract JSON patches from AI reply */
export function parsePatchesFromAiReply(text: string): ForgeFilePatch[] | null {
  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?"patches"[\s\S]*?\})\s*```/);
  const raw = jsonMatch?.[1] ?? (text.trim().startsWith("{") ? text.trim() : null);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { patches?: ForgeFilePatch[] };
    if (!Array.isArray(parsed.patches) || parsed.patches.length === 0) return null;
    return parsed.patches.slice(0, 20).map((p) => ({
      path: String(p.path).slice(0, 512),
      action: (p.action ?? "update") as PatchAction,
      content: p.content != null ? String(p.content).slice(0, 500_000) : undefined,
    }));
  } catch {
    return null;
  }
}
