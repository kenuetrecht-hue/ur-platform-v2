/**
 * TechBuilder sandbox — project files, storage tiers, and upgrade path for large app builds.
 */

import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";
import {
  deleteSandboxFileFromDb,
  loadSandboxFromDb,
  persistSandboxAccount,
  persistSandboxFile,
  persistSandboxProject,
} from "../db-coder-sandbox";
export type SandboxTierId = "starter" | "builder" | "studio" | "enterprise";

export type SandboxTier = {
  id: SandboxTierId;
  label: string;
  storageBytes: number;
  maxProjects: number;
  maxFilesPerProject: number;
  maxFileBytes: number;
  description: string;
  upgradePriceUsd: number | null;
};

export const SANDBOX_TIERS: Record<SandboxTierId, SandboxTier> = {
  starter: {
    id: "starter",
    label: "Starter",
    storageBytes: 50 * 1024 * 1024,
    maxProjects: 3,
    maxFilesPerProject: 100,
    maxFileBytes: 2 * 1024 * 1024,
    description: "Small prototypes and learning projects.",
    upgradePriceUsd: null,
  },
  builder: {
    id: "builder",
    label: "Builder",
    storageBytes: 500 * 1024 * 1024,
    maxProjects: 15,
    maxFilesPerProject: 1000,
    maxFileBytes: 10 * 1024 * 1024,
    description: "Full-stack apps with hundreds of files.",
    upgradePriceUsd: 29.99,
  },
  studio: {
    id: "studio",
    label: "Studio",
    storageBytes: 2 * 1024 * 1024 * 1024,
    maxProjects: 50,
    maxFilesPerProject: 5000,
    maxFileBytes: 25 * 1024 * 1024,
    description: "Large monorepos, multi-service apps, heavy assets.",
    upgradePriceUsd: 64.99,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    storageBytes: 10 * 1024 * 1024 * 1024,
    maxProjects: 999,
    maxFilesPerProject: 50_000,
    maxFileBytes: 100 * 1024 * 1024,
    description: "Massive apps — maximum sandbox storage for build & test.",
    upgradePriceUsd: 149.99,
  },
};

const TIER_ORDER: SandboxTierId[] = ["starter", "builder", "studio", "enterprise"];

export type SandboxFile = {
  id: string;
  path: string;
  content: string;
  language: string;
  sizeBytes: number;
  storageKey?: string;
  storageUrl?: string;
  updatedAt: string;
};

export type SandboxProject = {
  id: string;
  userId: string;
  name: string;
  description: string;
  framework: string;
  files: SandboxFile[];
  createdAt: string;
  updatedAt: string;
};

export type UserSandbox = {
  userId: string;
  tierId: SandboxTierId;
  projects: SandboxProject[];
  usedBytes: number;
  upgradedAt?: string;
  updatedAt: string;
};

const sandboxStore = new Map<string, UserSandbox>();

async function resolveSandbox(userId: string, isPlatformOwner: boolean): Promise<UserSandbox> {
  const cached = sandboxStore.get(userId);
  if (cached) return cached;

  const defaultTier: SandboxTierId = isPlatformOwner ? "enterprise" : "starter";
  const fromDb = await loadSandboxFromDb(userId, defaultTier);
  if (fromDb) {
    sandboxStore.set(userId, fromDb);
    return fromDb;
  }

  const record: UserSandbox = {
    userId,
    tierId: defaultTier,
    projects: [],
    usedBytes: 0,
    updatedAt: new Date().toISOString(),
  };
  sandboxStore.set(userId, record);
  return record;
}

async function syncSandbox(sandbox: UserSandbox): Promise<void> {
  recalcUsedBytes(sandbox);
  sandboxStore.set(sandbox.userId, sandbox);
  await persistSandboxAccount(
    sandbox.userId,
    sandbox.tierId,
    sandbox.usedBytes,
    sandbox.upgradedAt,
  );
}

function recalcUsedBytes(sandbox: UserSandbox): number {
  let total = 0;
  for (const project of sandbox.projects) {
    for (const file of project.files) {
      total += file.sizeBytes;
    }
  }
  sandbox.usedBytes = total;
  return total;
}

function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    json: "json",
    css: "css",
    html: "html",
    md: "markdown",
    py: "python",
    sql: "sql",
  };
  return map[ext] ?? "text";
}

function tierOf(id: SandboxTierId): SandboxTier {
  return SANDBOX_TIERS[id];
}

export async function getSandboxStatus(userId: string, isPlatformOwner: boolean) {
  const sandbox = await resolveSandbox(userId, isPlatformOwner);
  const tier = tierOf(sandbox.tierId);
  const usedBytes = recalcUsedBytes(sandbox);
  const nextTierIdx = TIER_ORDER.indexOf(sandbox.tierId) + 1;
  const nextTier = nextTierIdx < TIER_ORDER.length ? tierOf(TIER_ORDER[nextTierIdx]!) : null;

  return {
    tier,
    nextTier,
    usedBytes,
    remainingBytes: Math.max(0, tier.storageBytes - usedBytes),
    usagePercent: tier.storageBytes > 0 ? Math.min(100, (usedBytes / tier.storageBytes) * 100) : 0,
    projectCount: sandbox.projects.length,
    maxProjects: tier.maxProjects,
    allTiers: TIER_ORDER.map((id) => SANDBOX_TIERS[id]),
    upgradedAt: sandbox.upgradedAt,
    persistedToDb: true,
  };
}

export async function upgradeSandboxTier(params: {
  userId: string;
  targetTier: SandboxTierId;
  isPlatformOwner: boolean;
  actingAsOwner?: boolean;
}) {
  const sandbox = await resolveSandbox(params.userId, params.isPlatformOwner);
  const currentIdx = TIER_ORDER.indexOf(sandbox.tierId);
  const targetIdx = TIER_ORDER.indexOf(params.targetTier);

  if (targetIdx <= currentIdx && !params.actingAsOwner) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You can only upgrade to a higher storage tier.",
    });
  }

  if (params.targetTier === "enterprise" && !params.isPlatformOwner && !params.actingAsOwner) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Enterprise sandbox requires platform owner approval or purchase.",
    });
  }

  sandbox.tierId = params.targetTier;
  sandbox.upgradedAt = new Date().toISOString();
  sandbox.updatedAt = sandbox.upgradedAt;
  await syncSandbox(sandbox);

  return {
    ok: true as const,
    tier: tierOf(sandbox.tierId),
    status: await getSandboxStatus(params.userId, params.isPlatformOwner),
  };
}

export async function createSandboxProject(params: {
  userId: string;
  isPlatformOwner: boolean;
  name: string;
  description?: string;
  framework?: string;
}) {
  const sandbox = await resolveSandbox(params.userId, params.isPlatformOwner);
  const tier = tierOf(sandbox.tierId);

  if (sandbox.projects.length >= tier.maxProjects) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Project limit reached (${tier.maxProjects}). Upgrade sandbox storage to build more apps.`,
    });
  }

  const now = new Date().toISOString();
  const project: SandboxProject = {
    id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: params.userId,
    name: params.name.slice(0, 120),
    description: (params.description ?? "").slice(0, 2000),
    framework: params.framework ?? "React Native / Expo",
    files: [],
    createdAt: now,
    updatedAt: now,
  };

  sandbox.projects.unshift(project);
  sandbox.updatedAt = now;
  await persistSandboxProject(project);
  await syncSandbox(sandbox);
  return project;
}

export async function listSandboxProjects(userId: string, isPlatformOwner: boolean) {
  const sandbox = await resolveSandbox(userId, isPlatformOwner);
  return sandbox.projects;
}

export async function getSandboxProject(userId: string, isPlatformOwner: boolean, projectId: string) {
  const sandbox = await resolveSandbox(userId, isPlatformOwner);
  const project = sandbox.projects.find((p) => p.id === projectId);
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Sandbox project not found." });
  }
  return project;
}

export async function saveSandboxFile(params: {
  userId: string;
  isPlatformOwner: boolean;
  projectId: string;
  path: string;
  content: string;
  persistToCloud?: boolean;
}) {
  const sandbox = await resolveSandbox(params.userId, params.isPlatformOwner);
  const tier = tierOf(sandbox.tierId);
  const project = sandbox.projects.find((p) => p.id === params.projectId);

  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Sandbox project not found." });
  }

  const normalizedPath = params.path.replace(/^\/+/, "").slice(0, 512);
  if (!normalizedPath) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "File path required." });
  }

  const sizeBytes = Buffer.byteLength(params.content, "utf8");
  if (sizeBytes > tier.maxFileBytes) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `File exceeds ${Math.round(tier.maxFileBytes / (1024 * 1024))}MB limit for ${tier.label} tier.`,
    });
  }

  const existing = project.files.find((f) => f.path === normalizedPath);
  const delta = existing ? sizeBytes - existing.sizeBytes : sizeBytes;

  if (sandbox.usedBytes + delta > tier.storageBytes) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Sandbox storage full (${tier.label}). Upgrade to build larger apps.`,
    });
  }

  if (!existing && project.files.length >= tier.maxFilesPerProject) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `File limit reached (${tier.maxFilesPerProject}). Upgrade sandbox storage.`,
    });
  }

  const now = new Date().toISOString();
  let storageKey: string | undefined;
  let storageUrl: string | undefined;

  if (params.persistToCloud) {
    try {
      const uploaded = await storagePut(
        `sandbox/${params.userId}/${params.projectId}/${normalizedPath}`,
        params.content,
        "text/plain; charset=utf-8",
      );
      storageKey = uploaded.key;
      storageUrl = uploaded.url;
    } catch {
      // Cloud optional — local sandbox still works in dev without Forge keys
    }
  }

  const fileRecord: SandboxFile = {
    id: existing?.id ?? `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    path: normalizedPath,
    content: params.content,
    language: detectLanguage(normalizedPath),
    sizeBytes,
    storageKey,
    storageUrl,
    updatedAt: now,
  };

  if (existing) {
    Object.assign(existing, fileRecord);
  } else {
    project.files.push(fileRecord);
  }

  project.updatedAt = now;
  sandbox.updatedAt = now;
  await persistSandboxFile(params.userId, params.projectId, fileRecord);
  await syncSandbox(sandbox);

  return {
    file: fileRecord,
    project,
    status: await getSandboxStatus(params.userId, params.isPlatformOwner),
  };
}

export async function deleteSandboxFile(params: {
  userId: string;
  isPlatformOwner: boolean;
  projectId: string;
  path: string;
}) {
  const sandbox = await resolveSandbox(params.userId, params.isPlatformOwner);
  const project = sandbox.projects.find((p) => p.id === params.projectId);
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Sandbox project not found." });
  }

  const idx = project.files.findIndex((f) => f.path === params.path);
  if (idx === -1) {
    throw new TRPCError({ code: "NOT_FOUND", message: "File not found." });
  }

  project.files.splice(idx, 1);
  project.updatedAt = new Date().toISOString();
  sandbox.updatedAt = project.updatedAt;
  await deleteSandboxFileFromDb(params.userId, params.projectId, params.path);
  await syncSandbox(sandbox);

  return { ok: true as const, status: await getSandboxStatus(params.userId, params.isPlatformOwner) };
}

/** Lightweight syntax / structure check for sandbox test runs (no arbitrary code execution). */
export async function runSandboxTest(params: {
  userId: string;
  isPlatformOwner: boolean;
  projectId: string;
}) {
  const project = await getSandboxProject(params.userId, params.isPlatformOwner, params.projectId);
  const issues: string[] = [];
  let passed = 0;

  for (const file of project.files) {
    if (file.language === "json") {
      try {
        JSON.parse(file.content);
        passed += 1;
      } catch {
        issues.push(`${file.path}: invalid JSON`);
      }
    } else if (["typescript", "tsx", "javascript", "jsx"].includes(file.language)) {
      const openBraces = (file.content.match(/\{/g) ?? []).length;
      const closeBraces = (file.content.match(/\}/g) ?? []).length;
      if (openBraces !== closeBraces) {
        issues.push(`${file.path}: mismatched braces (${openBraces} open, ${closeBraces} close)`);
      } else {
        passed += 1;
      }
    } else {
      passed += 1;
    }
  }

  if (project.files.length === 0) {
    issues.push("No files in project — add source files before testing.");
  }

  return {
    projectId: project.id,
    projectName: project.name,
    filesChecked: project.files.length,
    checksPassed: passed,
    success: issues.length === 0 && project.files.length > 0,
    issues,
    testedAt: new Date().toISOString(),
  };
}
