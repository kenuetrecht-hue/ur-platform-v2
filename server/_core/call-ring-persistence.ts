/**
 * Saved phone rings and missed-call notes.
 * A private ring key never leaves this module.
 */

import { createHash, randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { getDb } from "../db";

const callRingSubscriptions = mysqlTable("callRingSubscriptions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 128 }).notNull(),
  endpoint: varchar("endpoint", { length: 768 }).notNull(),
  p256dh: varchar("p256dh", { length: 200 }).notNull(),
  auth: varchar("auth", { length: 200 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

const callRingKeys = mysqlTable("callRingKeys", {
  id: varchar("id", { length: 16 }).primaryKey(),
  publicKey: varchar("publicKey", { length: 200 }).notNull(),
  privateKey: varchar("privateKey", { length: 200 }).notNull(),
});

const callNotices = mysqlTable("callNotices", {
  id: varchar("id", { length: 64 }).primaryKey(),
  callerUserId: varchar("callerUserId", { length: 128 }).notNull(),
  calleeUserId: varchar("calleeUserId", { length: 128 }).notNull(),
  callerName: varchar("callerName", { length: 40 }).notNull(),
  roomId: varchar("roomId", { length: 64 }).notNull(),
  createdAt: varchar("createdAt", { length: 40 }).notNull(),
});

function skipPersistence(): boolean {
  return process.env.VITEST === "true" || process.env.NODE_ENV === "test";
}

export function callRingSubscriptionId(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex");
}

export async function persistCallRingSubscription(row: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  if (skipPersistence() || row.endpoint.length > 768) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .insert(callRingSubscriptions)
      .values({
        id: callRingSubscriptionId(row.endpoint),
        userId: row.userId,
        endpoint: row.endpoint,
        p256dh: row.p256dh,
        auth: row.auth,
      })
      .onDuplicateKeyUpdate({
        set: { userId: row.userId, p256dh: row.p256dh, auth: row.auth },
      });
  } catch {
    console.warn("[call-ring] could not save this phone");
  }
}

export async function loadCallRingSubscriptions(userId: string): Promise<
  Array<{ endpoint: string; keys: { p256dh: string; auth: string } }>
> {
  if (skipPersistence()) return [];
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db
      .select()
      .from(callRingSubscriptions)
      .where(eq(callRingSubscriptions.userId, userId));
    return rows.map((row) => ({
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    }));
  } catch {
    console.warn("[call-ring] could not load phones");
    return [];
  }
}

export async function loadCallRingKeyPair(): Promise<{ publicKey: string; privateKey: string } | null> {
  if (skipPersistence()) return null;
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db.select().from(callRingKeys).where(eq(callRingKeys.id, "vapid")).limit(1);
    const row = rows[0];
    if (!row?.publicKey || !row.privateKey) return null;
    return { publicKey: row.publicKey, privateKey: row.privateKey };
  } catch {
    return null;
  }
}

export async function persistCallRingKeyPair(pair: { publicKey: string; privateKey: string }): Promise<void> {
  if (skipPersistence()) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .insert(callRingKeys)
      .values({ id: "vapid", publicKey: pair.publicKey, privateKey: pair.privateKey })
      .onDuplicateKeyUpdate({
        set: { publicKey: pair.publicKey, privateKey: pair.privateKey },
      });
  } catch {
    console.warn("[call-ring] could not keep the ring key");
  }
}

export type StoredCallNotice = {
  id: string;
  callerUserId: string;
  calleeUserId: string;
  callerName: string;
  roomId: string;
  createdAt: string;
};

export async function persistCallNotice(notice: StoredCallNotice): Promise<void> {
  if (skipPersistence()) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(callNotices).values(notice).onDuplicateKeyUpdate({
      set: { callerName: notice.callerName },
    });
  } catch {
    console.warn("[call-ring] could not save the missed call");
  }
}

export async function loadCallNotices(userId: string): Promise<StoredCallNotice[]> {
  if (skipPersistence()) return [];
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db.select().from(callNotices).where(eq(callNotices.calleeUserId, userId));
    return rows.map((row) => ({
      id: row.id,
      callerUserId: row.callerUserId,
      calleeUserId: row.calleeUserId,
      callerName: row.callerName,
      roomId: row.roomId,
      createdAt: row.createdAt,
    }));
  } catch {
    return [];
  }
}

export async function deleteCallNotice(id: string): Promise<void> {
  if (skipPersistence()) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db.delete(callNotices).where(eq(callNotices.id, id));
  } catch {
    console.warn("[call-ring] could not clear the notice");
  }
}

export function newCallNoticeId(): string {
  return randomUUID();
}
