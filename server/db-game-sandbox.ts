/**
 * MySQL persistence for GameForge sandbox — falls back silently when DB unavailable.
 */

import { eq, and } from "drizzle-orm";
import {
  gameSandboxAccounts,
  gameSandboxFiles,
  gameSandboxProjects,
  type InsertGameSandboxAccount,
} from "../drizzle/schema";
import { getDb } from "./db";
import type {
  SandboxFile,
  SandboxProject,
  SandboxTierId,
  UserSandbox,
} from "./_core/coder-sandbox-service";
import { parseNumericUserId } from "./db-coder-sandbox";

export async function loadGameSandboxFromDb(
  userId: string,
  defaultTier: SandboxTierId,
): Promise<UserSandbox | null> {
  const db = await getDb();
  const numericId = parseNumericUserId(userId);
  if (!db || numericId == null) return null;

  try {
    const [account] = await db
      .select()
      .from(gameSandboxAccounts)
      .where(eq(gameSandboxAccounts.userId, numericId))
      .limit(1);

    const projectRows = await db
      .select()
      .from(gameSandboxProjects)
      .where(eq(gameSandboxProjects.userId, numericId));

    const fileRows = await db
      .select()
      .from(gameSandboxFiles)
      .where(eq(gameSandboxFiles.userId, numericId));

    const filesByProject = new Map<string, SandboxFile[]>();
    for (const row of fileRows) {
      const list = filesByProject.get(row.projectId) ?? [];
      list.push({
        id: row.id,
        path: row.path,
        content: row.content,
        language: row.language,
        sizeBytes: row.sizeBytes,
        storageKey: row.storageKey ?? undefined,
        storageUrl: row.storageUrl ?? undefined,
        updatedAt: row.updatedAt.toISOString(),
      });
      filesByProject.set(row.projectId, list);
    }

    const projects: SandboxProject[] = projectRows.map((row) => ({
      id: row.id,
      userId,
      name: row.name,
      description: row.description ?? "",
      framework: row.framework,
      files: filesByProject.get(row.id) ?? [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));

    return {
      userId,
      tierId: (account?.tierId ?? defaultTier) as SandboxTierId,
      projects,
      usedBytes: account?.usedBytes ?? 0,
      upgradedAt: account?.upgradedAt?.toISOString(),
      updatedAt: account?.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  } catch (error) {
    console.warn("[game-sandbox-db] load failed:", error);
    return null;
  }
}

export async function persistGameSandboxAccount(
  userId: string,
  tierId: SandboxTierId,
  usedBytes: number,
  upgradedAt?: string,
): Promise<void> {
  const db = await getDb();
  const numericId = parseNumericUserId(userId);
  if (!db || numericId == null) return;

  try {
    const values: InsertGameSandboxAccount = {
      userId: numericId,
      tierId,
      usedBytes,
      upgradedAt: upgradedAt ? new Date(upgradedAt) : undefined,
    };
    await db.insert(gameSandboxAccounts).values(values).onDuplicateKeyUpdate({
      set: { tierId, usedBytes, upgradedAt: upgradedAt ? new Date(upgradedAt) : undefined },
    });
  } catch (error) {
    console.warn("[game-sandbox-db] persist account failed:", error);
  }
}

export async function persistGameSandboxProject(project: SandboxProject): Promise<void> {
  const db = await getDb();
  const numericId = parseNumericUserId(project.userId);
  if (!db || numericId == null) return;

  try {
    await db
      .insert(gameSandboxProjects)
      .values({
        id: project.id,
        userId: numericId,
        name: project.name,
        description: project.description,
        framework: project.framework,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt),
      })
      .onDuplicateKeyUpdate({
        set: {
          name: project.name,
          description: project.description,
          framework: project.framework,
          updatedAt: new Date(project.updatedAt),
        },
      });
  } catch (error) {
    console.warn("[game-sandbox-db] persist project failed:", error);
  }
}

export async function persistGameSandboxFile(
  userId: string,
  projectId: string,
  file: SandboxFile,
): Promise<void> {
  const db = await getDb();
  const numericId = parseNumericUserId(userId);
  if (!db || numericId == null) return;

  try {
    await db
      .insert(gameSandboxFiles)
      .values({
        id: file.id,
        projectId,
        userId: numericId,
        path: file.path,
        content: file.content,
        language: file.language,
        sizeBytes: file.sizeBytes,
        storageKey: file.storageKey,
        storageUrl: file.storageUrl,
        updatedAt: new Date(file.updatedAt),
      })
      .onDuplicateKeyUpdate({
        set: {
          content: file.content,
          language: file.language,
          sizeBytes: file.sizeBytes,
          storageKey: file.storageKey,
          storageUrl: file.storageUrl,
          updatedAt: new Date(file.updatedAt),
        },
      });
  } catch (error) {
    console.warn("[game-sandbox-db] persist file failed:", error);
  }
}

export async function deleteGameSandboxFileFromDb(
  userId: string,
  projectId: string,
  path: string,
): Promise<void> {
  const db = await getDb();
  const numericId = parseNumericUserId(userId);
  if (!db || numericId == null) return;

  try {
    await db
      .delete(gameSandboxFiles)
      .where(
        and(
          eq(gameSandboxFiles.userId, numericId),
          eq(gameSandboxFiles.projectId, projectId),
          eq(gameSandboxFiles.path, path),
        ),
      );
  } catch (error) {
    console.warn("[game-sandbox-db] delete file failed:", error);
  }
}
