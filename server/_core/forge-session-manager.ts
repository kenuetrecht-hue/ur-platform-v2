/**
 * Forge execution sessions — ephemeral cloud workspaces with mandatory teardown.
 */

import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { disconnectForgeGitHub } from "./forge-github-service";
import { storageDeleteBestEffort } from "../storage";
import { ENV } from "./env";
import { sweepExpiredShareLinks } from "./forge-share-service";

export type ForgeSessionKind = "coder" | "game";

export type ForgeExecutionSession = {
  id: string;
  userId: string;
  specialist: ForgeSessionKind;
  projectId: string;
  workspacePath: string;
  cloudKeys: string[];
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  status: "active" | "running" | "destroyed";
};

const SESSION_TTL_MS = () => Math.max(5, ENV.forgeSessionTtlMinutes) * 60 * 1000;
const sessions = new Map<string, ForgeExecutionSession>();
const userSessionIndex = new Map<string, string>(); // `${specialist}:${userId}` -> sessionId

function userKey(userId: string, specialist: ForgeSessionKind): string {
  return `${specialist}:${userId}`;
}

function getForgeExecRoot(): string {
  return path.join(os.tmpdir(), "ur-forge-exec");
}

async function ensureExecRoot(): Promise<void> {
  await fs.mkdir(getForgeExecRoot(), { recursive: true });
}

export async function createForgeExecutionSession(params: {
  userId: string;
  specialist: ForgeSessionKind;
  projectId: string;
}): Promise<ForgeExecutionSession> {
  await ensureExecRoot();

  const existingId = userSessionIndex.get(userKey(params.userId, params.specialist));
  if (existingId) {
    const existing = sessions.get(existingId);
    if (existing && existing.status !== "destroyed" && Date.parse(existing.expiresAt) > Date.now()) {
      existing.lastActiveAt = new Date().toISOString();
      return existing;
    }
    if (existing) await destroyForgeSession(existingId, { reason: "replaced" });
  }

  const id = `fsess_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const workspacePath = path.join(getForgeExecRoot(), id);
  await fs.mkdir(workspacePath, { recursive: true });

  const now = Date.now();
  const session: ForgeExecutionSession = {
    id,
    userId: params.userId,
    specialist: params.specialist,
    projectId: params.projectId,
    workspacePath,
    cloudKeys: [],
    createdAt: new Date(now).toISOString(),
    lastActiveAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS()).toISOString(),
    status: "active",
  };

  sessions.set(id, session);
  userSessionIndex.set(userKey(params.userId, params.specialist), id);
  return session;
}

export function getForgeSession(sessionId: string): ForgeExecutionSession | null {
  const s = sessions.get(sessionId);
  if (!s || s.status === "destroyed") return null;
  if (Date.parse(s.expiresAt) <= Date.now()) return null;
  return s;
}

export function getActiveForgeSessionForUser(
  userId: string,
  specialist: ForgeSessionKind,
): ForgeExecutionSession | null {
  const id = userSessionIndex.get(userKey(userId, specialist));
  if (!id) return null;
  return getForgeSession(id);
}

export function trackSessionCloudKey(sessionId: string, key: string): void {
  const s = sessions.get(sessionId);
  if (s && s.status !== "destroyed" && !s.cloudKeys.includes(key)) {
    s.cloudKeys.push(key);
  }
}

export function touchForgeSession(sessionId: string): void {
  const s = sessions.get(sessionId);
  if (!s || s.status === "destroyed") return;
  const now = Date.now();
  s.lastActiveAt = new Date(now).toISOString();
  s.expiresAt = new Date(now + SESSION_TTL_MS()).toISOString();
}

async function wipeDirectory(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    console.warn("[forge-session] workspace wipe failed:", dir, error);
  }
}

async function wipeCloudKeys(keys: string[]): Promise<number> {
  let deleted = 0;
  for (const key of keys) {
    const ok = await storageDeleteBestEffort(key);
    if (ok) deleted += 1;
  }
  return deleted;
}

export async function destroyForgeSession(
  sessionId: string,
  opts: { wipeCloud?: boolean; disconnectGitHub?: boolean; reason?: string } = {},
): Promise<{
  ok: true;
  workspaceWiped: boolean;
  cloudKeysDeleted: number;
  githubDisconnected: boolean;
}> {
  const session = sessions.get(sessionId);
  if (!session) {
    return { ok: true, workspaceWiped: false, cloudKeysDeleted: 0, githubDisconnected: false };
  }

  if (session.status === "destroyed") {
    return { ok: true, workspaceWiped: true, cloudKeysDeleted: 0, githubDisconnected: false };
  }

  session.status = "destroyed";

  await wipeDirectory(session.workspacePath);

  const cloudKeysDeleted =
    opts.wipeCloud !== false ? await wipeCloudKeys(session.cloudKeys) : 0;

  let githubDisconnected = false;
  if (opts.disconnectGitHub !== false) {
    githubDisconnected = disconnectForgeGitHub(session.userId, session.specialist);
  }

  userSessionIndex.delete(userKey(session.userId, session.specialist));
  sessions.delete(sessionId);

  console.info(
    `[forge-session] destroyed ${sessionId} reason=${opts.reason ?? "user"} cloud=${cloudKeysDeleted}`,
  );

  return {
    ok: true,
    workspaceWiped: true,
    cloudKeysDeleted,
    githubDisconnected,
  };
}

export async function destroyAllSessionsForUser(userId: string): Promise<number> {
  let count = 0;
  for (const [id, s] of sessions) {
    if (s.userId === userId && s.status !== "destroyed") {
      await destroyForgeSession(id, { reason: "user_logout" });
      count += 1;
    }
  }
  return count;
}

export async function sweepExpiredForgeSessions(): Promise<number> {
  let swept = 0;
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (s.status !== "destroyed" && Date.parse(s.expiresAt) <= now) {
      await destroyForgeSession(id, { reason: "ttl_expired" });
      swept += 1;
    }
  }
  return swept;
}

export function startForgeSessionJanitor(intervalMs = 5 * 60 * 1000): void {
  setInterval(() => {
    void sweepExpiredForgeSessions().then((n) => {
      if (n > 0) console.info(`[forge-session] TTL sweep destroyed ${n} session(s)`);
    });
    const shares = sweepExpiredShareLinks();
    if (shares > 0) console.info(`[forge-share] expired ${shares} share link(s)`);
  }, intervalMs);
  console.info("[forge-session] janitor started (TTL + workspace wipe on destroy)");
}

export function listForgeSessionStatus(userId: string, specialist: ForgeSessionKind) {
  const session = getActiveForgeSessionForUser(userId, specialist);
  if (!session) {
    return {
      active: false as const,
      ephemeral: true,
      ttlMinutes: ENV.forgeSessionTtlMinutes,
      policy: "All cloud workspaces and temp files are wiped when the session ends or expires.",
    };
  }
  return {
    active: true as const,
    sessionId: session.id,
    projectId: session.projectId,
    expiresAt: session.expiresAt,
    cloudArtifactCount: session.cloudKeys.length,
    ephemeral: true,
    ttlMinutes: ENV.forgeSessionTtlMinutes,
    policy: "Workspace is destroyed on end session, after each cloud run, or when TTL expires.",
  };
}
