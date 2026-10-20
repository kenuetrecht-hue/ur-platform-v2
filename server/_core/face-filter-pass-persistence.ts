import { eq } from "drizzle-orm";
import { faceFilterPasses } from "../../drizzle/schema";
import { getDb } from "../db";

function skipPersistence(): boolean {
  return process.env.VITEST === "true" || process.env.NODE_ENV === "test";
}

export type StoredFaceFilterPass = {
  id: string;
  userId: string;
  planId: string;
  expiresAt: string;
};

export async function persistFaceFilterPass(pass: StoredFaceFilterPass): Promise<void> {
  if (skipPersistence()) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(faceFilterPasses).values({
      id: pass.id,
      userId: pass.userId,
      planId: pass.planId,
      expiresAt: pass.expiresAt,
    });
  } catch {
    console.warn("[face-filter] persist failed");
  }
}

export async function loadFaceFilterPasses(userId: string): Promise<StoredFaceFilterPass[]> {
  if (skipPersistence()) return [];
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db.select().from(faceFilterPasses).where(eq(faceFilterPasses.userId, userId));
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      planId: row.planId,
      expiresAt: row.expiresAt,
    }));
  } catch {
    console.warn("[face-filter] load failed");
    return [];
  }
}
