/**
 * Writes owner-approved source patches.
 * Live urplatform.llc changes only when a GitHub write token is set on the server.
 * The token is never sent to the model, logged, or returned in chat.
 */

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { TRPCError } from "@trpc/server";
import { ENV } from "./env";
import {
  isAllowedRepairPath,
  repairContextPaths,
  type SitePatch,
} from "../../lib/owner-site-repair";

const GITHUB_REPO = "kenuetrecht-hue/ur-platform-v2";
const GITHUB_BRANCH = "main";
const CONTEXT_CHARS = 4_000;

const staged = new Map<string, SitePatch[]>();

export function _resetSiteRepairsForTests(): void {
  staged.clear();
}

export function stageSitePatches(ownerUserId: string, patches: SitePatch[]): void {
  if (!patches.length) return;
  staged.set(ownerUserId, patches);
}

function repairToken(): string | null {
  const token = process.env.OWNER_SITE_REPAIR_GITHUB_TOKEN?.trim() ?? "";
  if (token.length < 10) return null;
  return token;
}

function assertOwner(isPlatformOwner: boolean): void {
  if (!isPlatformOwner) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the platform owner can apply a website repair.",
    });
  }
}

async function readLocalExcerpt(rootDir: string, rel: string): Promise<string | null> {
  if (!isAllowedRepairPath(rel)) return null;
  const root = path.resolve(rootDir);
  const target = path.resolve(root, rel);
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  try {
    const text = await readFile(target, "utf8");
    return text.slice(0, CONTEXT_CHARS);
  } catch {
    return null;
  }
}

async function readGithubExcerpt(
  rel: string,
  token: string,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  if (!isAllowedRepairPath(rel)) return null;
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${rel
    .split("/")
    .map(encodeURIComponent)
    .join("/")}?ref=${GITHUB_BRANCH}`;
  const res = await fetchImpl(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "ur-platform-owner-repair",
    },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { content?: string; encoding?: string };
  if (body.encoding !== "base64" || typeof body.content !== "string") return null;
  return Buffer.from(body.content.replace(/\n/g, ""), "base64").toString("utf8").slice(0, CONTEXT_CHARS);
}

export async function loadOwnerRepairContext(params: {
  message: string;
  rootDir?: string;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const paths = repairContextPaths(params.message);
  if (!paths.length) return "";
  const rootDir = params.rootDir ?? process.cwd();
  const token = repairToken();
  const fetchImpl = params.fetchImpl ?? fetch;
  const blocks: string[] = [];
  for (const rel of paths) {
    const local = await readLocalExcerpt(rootDir, rel);
    const remote = local == null && token ? await readGithubExcerpt(rel, token, fetchImpl).catch(() => null) : null;
    const excerpt = local ?? remote;
    if (!excerpt) continue;
    blocks.push(`FILE ${rel}\n${excerpt}`);
  }
  if (!blocks.length) return "";
  return `\n\n## Current source (read-only excerpt)\n${blocks.join("\n\n")}`;
}

async function pushGithubFile(params: {
  patch: SitePatch;
  token: string;
  fetchImpl: typeof fetch;
}): Promise<void> {
  const encodedPath = params.patch.path.split("/").map(encodeURIComponent).join("/");
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodedPath}`;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${params.token}`,
    "User-Agent": "ur-platform-owner-repair",
    "Content-Type": "application/json",
  };
  const existing = await params.fetchImpl(`${url}?ref=${GITHUB_BRANCH}`, { headers });
  let sha: string | undefined;
  if (existing.ok) {
    const body = (await existing.json()) as { sha?: string };
    sha = body.sha;
  } else if (existing.status !== 404) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "GitHub could not read that file. The site was not changed.",
    });
  }
  const put = await params.fetchImpl(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: "Owner-approved website repair",
      content: Buffer.from(params.patch.content, "utf8").toString("base64"),
      branch: GITHUB_BRANCH,
      sha,
    }),
  });
  if (!put.ok) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "GitHub refused the file update. The live site was not changed.",
    });
  }
}

async function writeLocalPatch(rootDir: string, patch: SitePatch): Promise<void> {
  const root = path.resolve(rootDir);
  const target = path.resolve(root, patch.path);
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "That file path is not allowed." });
  }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, patch.content, "utf8");
}

export async function applyStagedSitePatches(params: {
  ownerUserId: string;
  isPlatformOwner: boolean;
  rootDir?: string;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  assertOwner(params.isPlatformOwner);
  const patches = staged.get(params.ownerUserId) ?? [];
  if (!patches.length) {
    return "There is no patch waiting. Ask Doctor, Administration, or Security to draft the fix first, then type APPLY SITE PATCH.";
  }
  const token = repairToken();
  if (token) {
    const fetchImpl = params.fetchImpl ?? fetch;
    for (const patch of patches) {
      await pushGithubFile({ patch, token, fetchImpl });
    }
    staged.delete(params.ownerUserId);
    return `Wrote ${patches.length} file(s) to GitHub main: ${patches.map((p) => p.path).join(", ")}. Railway has to build that new commit before urplatform.llc changes. Refresh the site after the deployment says successful.`;
  }

  if (!ENV.isProduction) {
    const rootDir = params.rootDir ?? process.cwd();
    for (const patch of patches) {
      await writeLocalPatch(rootDir, patch);
    }
    staged.delete(params.ownerUserId);
    return `Wrote ${patches.length} file(s) on this computer: ${patches.map((p) => p.path).join(", ")}. The live site does not change until those files are on GitHub main and Railway finishes a new build.`;
  }

  return "The patch is saved in this chat, but this server cannot rebuild urplatform.llc yet. In Railway, on the ur-platform-v2 service only, add a variable named OWNER_SITE_REPAIR_GITHUB_TOKEN. Use a GitHub token that can write this repo and nothing else. Then type APPLY SITE PATCH again. Do not paste the token into chat.";
}
