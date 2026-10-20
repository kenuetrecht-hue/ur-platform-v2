/**
 * Counts free model calls. If the database is down, the free taste is refused
 * so a restart cannot open an unlimited bill. Paid passes do not use this counter.
 */

import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  FREE_TASTE_PER_USER_PER_DAY,
  FREE_TASTE_SITE_PER_DAY,
  FREE_TASTE_SITE_PER_MONTH,
  freeTasteDayKey,
  freeTasteDecision,
  freeTasteMonthKey,
} from "../../lib/free-taste-policy";

const memory = new Map<string, number>();

function skipPersistence(): boolean {
  return process.env.VITEST === "true" || process.env.NODE_ENV === "test";
}

function keys(userId: string, now: Date) {
  const day = freeTasteDayKey(now);
  const month = freeTasteMonthKey(now);
  return {
    user: `user:${userId}:${day}`,
    site: `site:${day}`,
    month: `month:${month}`,
  };
}

async function readCount(id: string): Promise<number> {
  if (skipPersistence()) return memory.get(id) ?? 0;
  const db = await getDb();
  if (!db) return Number.POSITIVE_INFINITY;
  try {
    const rows = await db.execute(sql`SELECT used FROM freeTasteCounters WHERE id = ${id} LIMIT 1`);
    const list = rows as unknown as Array<Array<{ used?: number }>>;
    const used = list[0]?.[0]?.used;
    return typeof used === "number" ? used : 0;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

async function incrementCapped(id: string, limit: number): Promise<boolean> {
  if (skipPersistence()) {
    const used = memory.get(id) ?? 0;
    if (used >= limit) return false;
    memory.set(id, used + 1);
    return true;
  }
  const db = await getDb();
  if (!db) return false;
  try {
    const updated = await db.execute(
      sql`UPDATE freeTasteCounters SET used = used + 1 WHERE id = ${id} AND used < ${limit}`,
    );
    const header = (updated as unknown as Array<{ affectedRows?: number }>)[0];
    if ((header?.affectedRows ?? 0) > 0) return true;
    try {
      await db.execute(sql`INSERT INTO freeTasteCounters (id, used) VALUES (${id}, 1)`);
      return limit > 0;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

export async function peekFreeTaste(userId: string, now = new Date()): Promise<{
  ok: boolean;
  userRemaining: number;
}> {
  const id = keys(userId, now);
  const [userUsed, siteUsed, monthUsed] = await Promise.all([
    readCount(id.user),
    readCount(id.site),
    readCount(id.month),
  ]);
  const decision = freeTasteDecision({ userUsed, siteUsed, monthUsed });
  return {
    ok: decision.ok,
    userRemaining: Math.max(0, FREE_TASTE_PER_USER_PER_DAY - userUsed),
  };
}

export async function claimFreeTaste(userId: string, now = new Date()): Promise<void> {
  const id = keys(userId, now);
  const before = freeTasteDecision({
    userUsed: await readCount(id.user),
    siteUsed: await readCount(id.site),
    monthUsed: await readCount(id.month),
  });
  if (!before.ok) {
    throw new TRPCError({ code: "FORBIDDEN", message: before.message });
  }
  const monthOk = await incrementCapped(id.month, FREE_TASTE_SITE_PER_MONTH);
  const siteOk = monthOk && (await incrementCapped(id.site, FREE_TASTE_SITE_PER_DAY));
  const userOk = siteOk && (await incrementCapped(id.user, FREE_TASTE_PER_USER_PER_DAY));
  if (!userOk) {
    const after = freeTasteDecision({
      userUsed: await readCount(id.user),
      siteUsed: await readCount(id.site),
      monthUsed: await readCount(id.month),
    });
    throw new TRPCError({
      code: "FORBIDDEN",
      message: after.ok
        ? "Free messages are paused so UR does not run up a bill. A text pass opens your own messages."
        : after.message,
    });
  }
}

const fieldCards = new Map<string, number>();

export function claimFieldCard(userId: string, now = new Date()): void {
  const id = `field:${userId}:${freeTasteDayKey(now)}`;
  const used = fieldCards.get(id) ?? 0;
  if (used >= 1) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You already made today's free field card. A text pass lets this specialist go further.",
    });
  }
  fieldCards.set(id, used + 1);
}

export function _resetFreeTasteForTests(): void {
  memory.clear();
  fieldCards.clear();
}
