/**
 * GameForge sandbox — larger tiers for massive games + security scanning on every write.
 */

import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";
import { assertGameSandboxFileSecure, scanGameSandboxContent } from "./game-dev-security";
import type { SandboxFile, SandboxProject, SandboxTier, SandboxTierId, UserSandbox } from "./coder-sandbox-service";
import {
  deleteGameSandboxFileFromDb,
  loadGameSandboxFromDb,
  persistGameSandboxAccount,
  persistGameSandboxFile,
  persistGameSandboxProject,
} from "../db-game-sandbox";

export type { SandboxFile, SandboxProject, SandboxTier, SandboxTierId, UserSandbox };

export const GAME_SANDBOX_TIERS: Record<SandboxTierId, SandboxTier> = {
  starter: {
    id: "starter",
    label: "Indie Starter",
    storageBytes: 100 * 1024 * 1024,
    maxProjects: 5,
    maxFilesPerProject: 200,
    maxFileBytes: 5 * 1024 * 1024,
    description: "Small prototypes and game jams.",
    upgradePriceUsd: null,
  },
  builder: {
    id: "builder",
    label: "Studio Builder",
    storageBytes: 1024 * 1024 * 1024,
    maxProjects: 20,
    maxFilesPerProject: 2000,
    maxFileBytes: 25 * 1024 * 1024,
    description: "Full indie games with assets and scripts.",
    upgradePriceUsd: 24.99,
  },
  studio: {
    id: "studio",
    label: "AA Studio",
    storageBytes: 5 * 1024 * 1024 * 1024,
    maxProjects: 50,
    maxFilesPerProject: 10_000,
    maxFileBytes: 50 * 1024 * 1024,
    description: "Large worlds, many levels, multiplayer modules.",
    upgradePriceUsd: 59.99,
  },
  enterprise: {
    id: "enterprise",
    label: "AAA Enterprise",
    storageBytes: 25 * 1024 * 1024 * 1024,
    maxProjects: 999,
    maxFilesPerProject: 100_000,
    maxFileBytes: 200 * 1024 * 1024,
    description: "Massive video games — maximum secure sandbox storage.",
    upgradePriceUsd: 199.99,
  },
};

const TIER_ORDER: SandboxTierId[] = ["starter", "builder", "studio", "enterprise"];
const gameStore = new Map<string, UserSandbox>();

function tierOf(id: SandboxTierId): SandboxTier {
  return GAME_SANDBOX_TIERS[id];
}

async function resolveSandbox(userId: string, isPlatformOwner: boolean): Promise<UserSandbox> {
  const cached = gameStore.get(userId);
  if (cached) return cached;

  const defaultTier: SandboxTierId = isPlatformOwner ? "enterprise" : "starter";
  const fromDb = await loadGameSandboxFromDb(userId, defaultTier);
  if (fromDb) {
    gameStore.set(userId, fromDb);
    return fromDb;
  }

  const record: UserSandbox = {
    userId,
    tierId: defaultTier,
    projects: [],
    usedBytes: 0,
    updatedAt: new Date().toISOString(),
  };
  gameStore.set(userId, record);
  return record;
}

async function syncGameSandbox(sandbox: UserSandbox): Promise<void> {
  recalcUsedBytes(sandbox);
  gameStore.set(sandbox.userId, sandbox);
  await persistGameSandboxAccount(
    sandbox.userId,
    sandbox.tierId,
    sandbox.usedBytes,
    sandbox.upgradedAt,
  );
}

function recalcUsedBytes(sandbox: UserSandbox): number {
  let total = 0;
  for (const project of sandbox.projects) {
    for (const file of project.files) total += file.sizeBytes;
  }
  sandbox.usedBytes = total;
  return total;
}

function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    gd: "gdscript", cs: "csharp", ts: "typescript", js: "javascript", json: "json",
    md: "markdown", yaml: "yaml", yml: "yaml", glsl: "glsl", hlsl: "hlsl",
  };
  return map[ext] ?? "text";
}

export async function getGameSandboxStatus(userId: string, isPlatformOwner: boolean) {
  const sandbox = await resolveSandbox(userId, isPlatformOwner);
  const tier = tierOf(sandbox.tierId);
  const usedBytes = recalcUsedBytes(sandbox);
  const nextIdx = TIER_ORDER.indexOf(sandbox.tierId) + 1;
  const nextTier = nextIdx < TIER_ORDER.length ? tierOf(TIER_ORDER[nextIdx]!) : null;
  return {
    tier,
    nextTier,
    usedBytes,
    remainingBytes: Math.max(0, tier.storageBytes - usedBytes),
    usagePercent: tier.storageBytes > 0 ? Math.min(100, (usedBytes / tier.storageBytes) * 100) : 0,
    projectCount: sandbox.projects.length,
    maxProjects: tier.maxProjects,
    allTiers: TIER_ORDER.map((id) => GAME_SANDBOX_TIERS[id]),
    secured: true,
    persistedToDb: true,
  };
}

export async function upgradeGameSandboxTier(params: {
  userId: string;
  targetTier: SandboxTierId;
  isPlatformOwner: boolean;
  actingAsOwner?: boolean;
}) {
  const sandbox = await resolveSandbox(params.userId, params.isPlatformOwner);
  const currentIdx = TIER_ORDER.indexOf(sandbox.tierId);
  const targetIdx = TIER_ORDER.indexOf(params.targetTier);
  if (targetIdx <= currentIdx && !params.actingAsOwner) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Upgrade to a higher tier only." });
  }
  sandbox.tierId = params.targetTier;
  sandbox.upgradedAt = new Date().toISOString();
  sandbox.updatedAt = sandbox.upgradedAt;
  await syncGameSandbox(sandbox);
  return { ok: true as const, tier: tierOf(sandbox.tierId), status: await getGameSandboxStatus(params.userId, params.isPlatformOwner) };
}

export async function createGameSandboxProject(params: {
  userId: string;
  isPlatformOwner: boolean;
  name: string;
  description?: string;
  engine?: string;
}) {
  const sandbox = await resolveSandbox(params.userId, params.isPlatformOwner);
  const tier = tierOf(sandbox.tierId);
  if (sandbox.projects.length >= tier.maxProjects) {
    throw new TRPCError({ code: "FORBIDDEN", message: `Project limit (${tier.maxProjects}). Upgrade storage.` });
  }
  const now = new Date().toISOString();
  const project: SandboxProject = {
    id: `gproj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: params.userId,
    name: params.name.slice(0, 120),
    description: (params.description ?? "").slice(0, 2000),
    framework: params.engine ?? "Godot 4 / Unity",
    files: [],
    createdAt: now,
    updatedAt: now,
  };
  sandbox.projects.unshift(project);
  sandbox.updatedAt = now;
  await persistGameSandboxProject(project);
  await syncGameSandbox(sandbox);
  return project;
}

export async function listGameSandboxProjects(userId: string, isPlatformOwner: boolean) {
  return (await resolveSandbox(userId, isPlatformOwner)).projects;
}

export async function getGameSandboxProject(userId: string, isPlatformOwner: boolean, projectId: string) {
  const project = (await resolveSandbox(userId, isPlatformOwner)).projects.find((p) => p.id === projectId);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Game project not found." });
  return project;
}

export async function saveGameSandboxFile(params: {
  userId: string;
  isPlatformOwner: boolean;
  projectId: string;
  path: string;
  content: string;
  persistToCloud?: boolean;
}) {
  assertGameSandboxFileSecure(params.path, params.content);

  const sandbox = await resolveSandbox(params.userId, params.isPlatformOwner);
  const tier = tierOf(sandbox.tierId);
  const project = sandbox.projects.find((p) => p.id === params.projectId);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Game project not found." });

  const normalizedPath = params.path.replace(/^\/+/, "").slice(0, 512);
  const sizeBytes = Buffer.byteLength(params.content, "utf8");
  if (sizeBytes > tier.maxFileBytes) {
    throw new TRPCError({ code: "FORBIDDEN", message: `File exceeds ${tier.label} tier limit.` });
  }

  const existing = project.files.find((f) => f.path === normalizedPath);
  const delta = existing ? sizeBytes - existing.sizeBytes : sizeBytes;
  if (sandbox.usedBytes + delta > tier.storageBytes) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Sandbox full — upgrade for massive games." });
  }

  const now = new Date().toISOString();
  let storageKey: string | undefined;
  let storageUrl: string | undefined;
  if (params.persistToCloud) {
    try {
      const uploaded = await storagePut(
        `game-sandbox/${params.userId}/${params.projectId}/${normalizedPath}`,
        params.content,
        "text/plain; charset=utf-8",
      );
      storageKey = uploaded.key;
      storageUrl = uploaded.url;
    } catch {
      // optional cloud
    }
  }

  const fileRecord: SandboxFile = {
    id: existing?.id ?? `gfile_${Date.now()}`,
    path: normalizedPath,
    content: params.content,
    language: detectLanguage(normalizedPath),
    sizeBytes,
    storageKey,
    storageUrl,
    updatedAt: now,
  };
  if (existing) Object.assign(existing, fileRecord);
  else project.files.push(fileRecord);
  project.updatedAt = now;
  await persistGameSandboxFile(params.userId, params.projectId, fileRecord);
  await syncGameSandbox(sandbox);
  return { file: fileRecord, project, status: await getGameSandboxStatus(params.userId, params.isPlatformOwner) };
}

export async function deleteGameSandboxFile(params: {
  userId: string;
  isPlatformOwner: boolean;
  projectId: string;
  path: string;
}) {
  const sandbox = await resolveSandbox(params.userId, params.isPlatformOwner);
  const project = sandbox.projects.find((p) => p.id === params.projectId);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Game project not found." });

  const idx = project.files.findIndex((f) => f.path === params.path);
  if (idx === -1) throw new TRPCError({ code: "NOT_FOUND", message: "File not found." });

  project.files.splice(idx, 1);
  project.updatedAt = new Date().toISOString();
  sandbox.updatedAt = project.updatedAt;
  await deleteGameSandboxFileFromDb(params.userId, params.projectId, params.path);
  await syncGameSandbox(sandbox);
  return { ok: true as const, status: await getGameSandboxStatus(params.userId, params.isPlatformOwner) };
}

export async function runGameSandboxTest(params: { userId: string; isPlatformOwner: boolean; projectId: string }) {
  const project = await getGameSandboxProject(params.userId, params.isPlatformOwner, params.projectId);
  const issues: string[] = [];
  let passed = 0;
  for (const file of project.files) {
    const scan = scanGameSandboxContent(file.content, file.path);
    if (!scan.safe) {
      issues.push(...scan.issues);
    } else {
      passed += 1;
    }
    if (file.language === "json") {
      try { JSON.parse(file.content); } catch { issues.push(`${file.path}: invalid JSON`); }
    }
  }
  if (!project.files.length) issues.push("Add game scripts or design docs before testing.");
  return {
    projectId: project.id,
    projectName: project.name,
    filesChecked: project.files.length,
    checksPassed: passed,
    success: issues.length === 0 && project.files.length > 0,
    issues,
    secured: true,
    testedAt: new Date().toISOString(),
  };
}

export async function executeGameBuild(params: { userId: string; isPlatformOwner: boolean; projectId: string }) {
  const project = await getGameSandboxProject(params.userId, params.isPlatformOwner, params.projectId);
  const issues: string[] = [];
  const warnings: string[] = [];
  const entryCandidates = ["main.gd", "Main.cs", "GameManager.cs", "project.godot", "scenes/Main.tscn"];
  const paths = new Set(project.files.map((f) => f.path));
  const entryPoints = entryCandidates.filter((c) => paths.has(c) || [...paths].some((p) => p.endsWith(c)));
  if (!entryPoints.length) warnings.push("No standard entry point — add main.gd, Main.cs, or project.godot");

  for (const file of project.files) {
    try {
      assertGameSandboxFileSecure(file.path, file.content);
    } catch (e) {
      issues.push(e instanceof Error ? e.message : "blocked");
    }
  }

  const totalBytes = project.files.reduce((s, f) => s + f.sizeBytes, 0);
  return {
    projectId: project.id,
    projectName: project.name,
    success: issues.length === 0 && project.files.length > 0,
    filesChecked: project.files.length,
    estimatedAssetMb: Math.round(totalBytes / (1024 * 1024)),
    entryPoints,
    issues,
    warnings,
    secured: true,
    testedAt: new Date().toISOString(),
  };
}
