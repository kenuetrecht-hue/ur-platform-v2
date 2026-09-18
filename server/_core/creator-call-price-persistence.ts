/**
 * Best-effort MySQL persist for creator 1-to-1 call prices.
 * Missing table must not wipe the creator roster.
 */

import { eq } from "drizzle-orm";
import { creatorVideoCallPrices } from "../../drizzle/schema";
import { getDb } from "../db";

function skipPersistence(): boolean {
  return process.env.VITEST === "true" || process.env.NODE_ENV === "test";
}

export async function persistCreatorVideoCallPrice(params: {
  creatorUserId: string;
  priceCents: number;
}): Promise<void> {
  if (skipPersistence()) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .insert(creatorVideoCallPrices)
      .values({
        creatorUserId: params.creatorUserId,
        priceCents: params.priceCents,
      })
      .onDuplicateKeyUpdate({
        set: { priceCents: params.priceCents },
      });
  } catch (error) {
    console.warn("[creator-call-price] persist failed:", error);
  }
}

export async function loadCreatorVideoCallPrices(): Promise<Array<{ creatorUserId: string; priceCents: number }>> {
  if (skipPersistence()) return [];
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db.select().from(creatorVideoCallPrices);
    return rows.map((row) => ({
      creatorUserId: row.creatorUserId,
      priceCents: row.priceCents,
    }));
  } catch (error) {
    console.warn("[creator-call-price] load failed:", error);
    return [];
  }
}

export async function deleteCreatorVideoCallPrice(creatorUserId: string): Promise<void> {
  if (skipPersistence()) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db.delete(creatorVideoCallPrices).where(eq(creatorVideoCallPrices.creatorUserId, creatorUserId));
  } catch (error) {
    console.warn("[creator-call-price] delete failed:", error);
  }
}
