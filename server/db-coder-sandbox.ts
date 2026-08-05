/**
 * MySQL persistence for TechBuilder sandbox — falls back silently when DB unavailable.
 */

import { eq, and } from "drizzle-orm";
import {
  coderSandboxAccounts,
  coderSandboxFiles,
  coderSandboxProjects,
  coderSandboxPayments,
  type InsertCoderSandboxAccount,
} from "../drizzle/schema";
import { getDb } from "./db";
import type {
  SandboxFile,
  SandboxProject,
  SandboxTierId,
  UserSandbox,
} from "./_core/coder-sandbox-service";

export function parseNumericUserId(userId: string): number | null {
  const n = Number(userId);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function loadSandboxFromDb(
  userId: string,
  defaultTier: SandboxTierId,
): Promise<UserSandbox | null> {
  const db = await getDb();
  const numericId = parseNumericUserId(userId);
  if (!db || numericId == null) return null;

  try {
    const [account] = await db
      .select()
      .from(coderSandboxAccounts)
      .where(eq(coderSandboxAccounts.userId, numericId))
      .limit(1);

    const projectRows = await db
      .select()
      .from(coderSandboxProjects)
      .where(eq(coderSandboxProjects.userId, numericId));

    const fileRows = await db
      .select()
      .from(coderSandboxFiles)
      .where(eq(coderSandboxFiles.userId, numericId));

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
    console.warn("[coder-sandbox-db] load failed:", error);
    return null;
  }
}

export async function persistSandboxAccount(
  userId: string,
  tierId: SandboxTierId,
  usedBytes: number,
  upgradedAt?: string,
): Promise<void> {
  const db = await getDb();
  const numericId = parseNumericUserId(userId);
  if (!db || numericId == null) return;

  try {
    const values: InsertCoderSandboxAccount = {
      userId: numericId,
      tierId,
      usedBytes,
      upgradedAt: upgradedAt ? new Date(upgradedAt) : undefined,
    };

    await db.insert(coderSandboxAccounts).values(values).onDuplicateKeyUpdate({
      set: {
        tierId,
        usedBytes,
        upgradedAt: upgradedAt ? new Date(upgradedAt) : undefined,
      },
    });
  } catch (error) {
    console.warn("[coder-sandbox-db] persist account failed:", error);
  }
}

export async function persistSandboxProject(project: SandboxProject): Promise<void> {
  const db = await getDb();
  const numericId = parseNumericUserId(project.userId);
  if (!db || numericId == null) return;

  try {
    await db
      .insert(coderSandboxProjects)
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
    console.warn("[coder-sandbox-db] persist project failed:", error);
  }
}

export async function persistSandboxFile(
  userId: string,
  projectId: string,
  file: SandboxFile,
): Promise<void> {
  const db = await getDb();
  const numericId = parseNumericUserId(userId);
  if (!db || numericId == null) return;

  try {
    await db
      .insert(coderSandboxFiles)
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
    console.warn("[coder-sandbox-db] persist file failed:", error);
  }
}

export async function deleteSandboxFileFromDb(
  userId: string,
  projectId: string,
  path: string,
): Promise<void> {
  const db = await getDb();
  const numericId = parseNumericUserId(userId);
  if (!db || numericId == null) return;

  try {
    await db
      .delete(coderSandboxFiles)
      .where(
        and(
          eq(coderSandboxFiles.userId, numericId),
          eq(coderSandboxFiles.projectId, projectId),
          eq(coderSandboxFiles.path, path),
        ),
      );
  } catch (error) {
    console.warn("[coder-sandbox-db] delete file failed:", error);
  }
}

export async function loadLearningJson(userId: string): Promise<string | null> {
  const db = await getDb();
  const numericId = parseNumericUserId(userId);
  if (!db || numericId == null) return null;

  try {
    const [row] = await db
      .select({ learningJson: coderSandboxAccounts.learningJson })
      .from(coderSandboxAccounts)
      .where(eq(coderSandboxAccounts.userId, numericId))
      .limit(1);
    return row?.learningJson ?? null;
  } catch {
    return null;
  }
}

export async function saveLearningJson(userId: string, json: string): Promise<void> {
  const db = await getDb();
  const numericId = parseNumericUserId(userId);
  if (!db || numericId == null) return;

  try {
    await db
      .insert(coderSandboxAccounts)
      .values({ userId: numericId, tierId: "starter", usedBytes: 0, learningJson: json })
      .onDuplicateKeyUpdate({ set: { learningJson: json } });
  } catch (error) {
    console.warn("[coder-sandbox-db] save learning failed:", error);
  }
}

export async function recordSandboxPayment(params: {
  userId: string;
  tierId: "builder" | "studio" | "enterprise";
  paymentIntentId: string;
  amountCents: number;
  status: "pending" | "succeeded" | "failed";
}): Promise<void> {
  const db = await getDb();
  const numericId = parseNumericUserId(params.userId);
  if (!db || numericId == null) return;

  try {
    await db.insert(coderSandboxPayments).values({
      userId: numericId,
      tierId: params.tierId,
      paymentIntentId: params.paymentIntentId,
      amountCents: params.amountCents,
      status: params.status,
    });
  } catch (error) {
    console.warn("[coder-sandbox-db] record payment failed:", error);
  }
}

export async function updateSandboxPaymentStatus(
  paymentIntentId: string,
  status: "pending" | "succeeded" | "failed",
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .update(coderSandboxPayments)
      .set({ status })
      .where(eq(coderSandboxPayments.paymentIntentId, paymentIntentId));
  } catch (error) {
    console.warn("[coder-sandbox-db] update payment failed:", error);
  }
}
