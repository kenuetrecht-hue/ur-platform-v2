/**
 * Saves a member's website, logo, game, or teaching-chain build into their sandbox.
 * Does not edit the live UR Platform repository.
 */

import { TRPCError } from "@trpc/server";
import { memberBuildKind, memberBuilderPrompt, starterFilesFor, type MemberBuilderKind } from "../../lib/member-builder";
import { SANDBOX_LAYER_PRICE_LINE } from "../../lib/sandbox-layers";
import { applyForgePatches, type ForgeFilePatch } from "./forge-patch-service";
import { createSandboxProject, listSandboxProjects } from "./coder-sandbox-service";
import { createGameSandboxProject, listGameSandboxProjects } from "./game-dev-sandbox-service";

function patchesFor(kind: MemberBuilderKind): ForgeFilePatch[] {
  return starterFilesFor(kind).map((file) => ({
    path: file.path,
    action: "create" as const,
    content: file.content,
  }));
}

export function promptForMemberBuild(creatorId: string, message: string): string {
  const kind = memberBuildKind(creatorId, message);
  if (!kind) return "";
  return `\n\n## Build this with them\n${memberBuilderPrompt(kind)}\nWhen you show code, use the file names from the sandbox starter so they can edit the same files.`;
}

export async function saveMemberBuild(params: {
  creatorId: string;
  message: string;
  userId: string;
  isPlatformOwner: boolean;
}): Promise<{ note: string; projectId: string; paths: string[] } | null> {
  const kind = memberBuildKind(params.creatorId, params.message);
  if (!kind) return null;

  const useGame = kind === "game";
  try {
    const existing = useGame
      ? await listGameSandboxProjects(params.userId, params.isPlatformOwner)
      : await listSandboxProjects(params.userId, params.isPlatformOwner);
    const named = existing.find((project) => project.name === `My ${kind}`);
    const project =
      named ??
      (useGame
        ? await createGameSandboxProject({
            userId: params.userId,
            isPlatformOwner: params.isPlatformOwner,
            name: `My ${kind}`,
            engine: "HTML5",
          })
        : await createSandboxProject({
            userId: params.userId,
            isPlatformOwner: params.isPlatformOwner,
            name: `My ${kind}`,
            framework: kind,
          }));

    if (project.files.length > 0) {
      return {
        note: `\n\nYour ${kind} project is already in the Build sandbox (${project.files.length} file(s)). Edit those files, or ask for a change to a named file.`,
        projectId: project.id,
        paths: project.files.map((file) => file.path),
      };
    }

    const applied = await applyForgePatches({
      specialist: useGame ? "game" : "coder",
      userId: params.userId,
      isPlatformOwner: params.isPlatformOwner,
      projectId: project.id,
      patches: patchesFor(kind),
    });
    const paths = applied.applied.map((item) => item.replace(/^(create|update|delete):/, ""));
    return {
      note: `\n\nSaved in your Build sandbox: ${paths.join(", ")}. Open Build to edit the code. This did not change urplatform.llc.`,
      projectId: project.id,
      paths,
    };
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      return {
        note: `\n\nThis sandbox is full for that size. ${SANDBOX_LAYER_PRICE_LINE}`,
        projectId: "",
        paths: [],
      };
    }
    if (error instanceof TRPCError) {
      return {
        note: "\n\nThat file was blocked by the sandbox safety check, so nothing was saved.",
        projectId: "",
        paths: [],
      };
    }
    throw error;
  }
}
