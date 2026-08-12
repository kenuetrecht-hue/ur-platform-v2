/**
 * Durable AI chat threads — MySQL when available, in-memory fallback for local dev.
 */

import { randomUUID } from "crypto";
import { and, asc, eq, gt } from "drizzle-orm";
import { aiChatMessages, aiChatThreads } from "../../drizzle/schema";
import { getDb } from "../db";
import { sanitizeUserText } from "./input-sanitize";

export type PersistedChatRole = "user" | "assistant";

export type PersistedChatMessage = {
  id: string;
  role: PersistedChatRole;
  content: string;
  createdAt: string;
};

export type PersistedChatThread = {
  threadId: string;
  creatorId: string;
  updatedAt: string;
  messages: PersistedChatMessage[];
};

const MAX_STORED_MESSAGES = 200;
const MAX_LOAD_MESSAGES = 40;
const MAX_CONTENT_LENGTH = 4000;

type MemThread = {
  id: string;
  userId: number;
  creatorId: string;
  updatedAt: Date;
  messages: PersistedChatMessage[];
};

const memThreadsByKey = new Map<string, MemThread>();

function threadKey(userId: number, creatorId: string): string {
  return `${userId}:${creatorId}`;
}

function toIso(date: Date): string {
  return date.toISOString();
}

function sanitizeContent(content: string): string {
  return sanitizeUserText(content, MAX_CONTENT_LENGTH);
}

function trimThreadMessages(messages: PersistedChatMessage[]): PersistedChatMessage[] {
  if (messages.length <= MAX_STORED_MESSAGES) return messages;
  return messages.slice(messages.length - MAX_STORED_MESSAGES);
}

function isDbConnectionRefused(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const cause = "cause" in error ? (error as { cause?: unknown }).cause : null;
  if (cause && typeof cause === "object" && cause !== null && "code" in cause) {
    return (cause as { code?: string }).code === "ECONNREFUSED";
  }
  return String(error).includes("ECONNREFUSED");
}

function isMissingAiChatTable(error: unknown): boolean {
  const text = String(error);
  return text.includes("aiChatThreads") || text.includes("aiChatMessages") || text.includes("ER_NO_SUCH_TABLE");
}

async function runWithDb<T>(
  operation: (db: NonNullable<Awaited<ReturnType<typeof getDb>>>) => Promise<T>,
): Promise<T | "unavailable"> {
  if (process.env.AI_CHAT_FORCE_MEMORY === "1") return "unavailable";
  const db = await getDb();
  if (!db) return "unavailable";
  try {
    return await operation(db);
  } catch (error) {
    if (isDbConnectionRefused(error) || isMissingAiChatTable(error)) {
      console.warn("[ai-chat-sync] MySQL unavailable — using in-memory thread store.");
      return "unavailable";
    }
    throw error;
  }
}

async function getOrCreateMemThread(userId: number, creatorId: string): Promise<MemThread> {
  const key = threadKey(userId, creatorId);
  let thread = memThreadsByKey.get(key);
  if (!thread) {
    thread = {
      id: randomUUID(),
      userId,
      creatorId,
      updatedAt: new Date(),
      messages: [],
    };
    memThreadsByKey.set(key, thread);
  }
  return thread;
}

export async function getOrCreateAiChatThread(params: {
  userId: number;
  creatorId: string;
}): Promise<{ threadId: string; updatedAt: string }> {
  const dbResult = await runWithDb(async (db) => {
    const existing = await db
      .select()
      .from(aiChatThreads)
      .where(and(eq(aiChatThreads.userId, params.userId), eq(aiChatThreads.creatorId, params.creatorId)))
      .limit(1);

    if (existing[0]) {
      return {
        threadId: existing[0].id,
        updatedAt: toIso(existing[0].updatedAt),
      };
    }

    const id = randomUUID();
    const now = new Date();
    await db.insert(aiChatThreads).values({
      id,
      userId: params.userId,
      creatorId: params.creatorId,
      createdAt: now,
      updatedAt: now,
    });

    return { threadId: id, updatedAt: toIso(now) };
  });

  if (dbResult !== "unavailable") return dbResult;

  const mem = await getOrCreateMemThread(params.userId, params.creatorId);
  return { threadId: mem.id, updatedAt: toIso(mem.updatedAt) };
}

export async function listAiChatMessages(params: {
  userId: number;
  creatorId: string;
  limit?: number;
  since?: Date;
}): Promise<PersistedChatThread | null> {
  const limit = Math.min(params.limit ?? MAX_LOAD_MESSAGES, MAX_LOAD_MESSAGES);

  const dbResult = await runWithDb(async (db) => {
    const threadRow = await db
      .select()
      .from(aiChatThreads)
      .where(and(eq(aiChatThreads.userId, params.userId), eq(aiChatThreads.creatorId, params.creatorId)))
      .limit(1);

    const thread = threadRow[0];
    if (!thread) return null;

    const conditions = [eq(aiChatMessages.threadId, thread.id)];
    if (params.since) {
      conditions.push(gt(aiChatMessages.createdAt, params.since));
    }

    const rows = await db
      .select()
      .from(aiChatMessages)
      .where(and(...conditions))
      .orderBy(asc(aiChatMessages.createdAt))
      .limit(params.since ? 100 : limit);

    return {
      threadId: thread.id,
      creatorId: thread.creatorId,
      updatedAt: toIso(thread.updatedAt),
      messages: rows.map((row) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        createdAt: toIso(row.createdAt),
      })),
    };
  });

  if (dbResult !== "unavailable") return dbResult;

  const mem = memThreadsByKey.get(threadKey(params.userId, params.creatorId));
  if (!mem) return null;
  let messages = mem.messages;
  if (params.since) {
    messages = messages.filter((m) => new Date(m.createdAt) > params.since!);
  } else {
    messages = messages.slice(-limit);
  }
  return {
    threadId: mem.id,
    creatorId: mem.creatorId,
    updatedAt: toIso(mem.updatedAt),
    messages,
  };
}

export async function loadAiChatHistoryForModel(params: {
  userId: number;
  creatorId: string;
  maxTurns?: number;
}): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const thread = await listAiChatMessages({
    userId: params.userId,
    creatorId: params.creatorId,
    limit: params.maxTurns ?? 20,
  });
  if (!thread?.messages.length) return [];

  return thread.messages
    .slice(-(params.maxTurns ?? 20))
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));
}

export async function appendAiChatTurns(params: {
  userId: number;
  creatorId: string;
  turns: Array<{ role: PersistedChatRole; content: string }>;
}): Promise<{ threadId: string; messageIds: string[]; updatedAt: string }> {
  const { threadId } = await getOrCreateAiChatThread({
    userId: params.userId,
    creatorId: params.creatorId,
  });

  const baseMs = Date.now();
  const sanitized = params.turns
    .filter((t) => t.content.trim().length > 0)
    .map((t, index) => ({
      id: randomUUID(),
      role: t.role,
      content: sanitizeContent(t.content),
      createdAt: new Date(baseMs + index),
    }));

  if (sanitized.length === 0) {
    return { threadId, messageIds: [], updatedAt: toIso(new Date(baseMs)) };
  }

  const now = sanitized[sanitized.length - 1]!.createdAt;

  const dbResult = await runWithDb(async (db) => {
    await db.insert(aiChatMessages).values(
      sanitized.map((s) => ({
        id: s.id,
        threadId,
        role: s.role,
        content: s.content,
        createdAt: s.createdAt,
      })),
    );

    await db
      .update(aiChatThreads)
      .set({ updatedAt: now })
      .where(eq(aiChatThreads.id, threadId));

    return { threadId, messageIds: sanitized.map((s) => s.id), updatedAt: toIso(now) };
  });

  if (dbResult !== "unavailable") return dbResult;

  const mem = await getOrCreateMemThread(params.userId, params.creatorId);
    mem.messages = trimThreadMessages([
      ...mem.messages,
      ...sanitized.map((s) => ({
        id: s.id,
        role: s.role,
        content: s.content,
        createdAt: toIso(s.createdAt),
      })),
    ]);
    mem.updatedAt = now;
    return { threadId: mem.id, messageIds: sanitized.map((s) => s.id), updatedAt: toIso(now) };
}

export async function assertAiChatThreadOwned(params: {
  threadId: string;
  userId: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    for (const thread of memThreadsByKey.values()) {
      if (thread.id === params.threadId && thread.userId === params.userId) return;
    }
    throw new Error("RESOURCE_NOT_FOUND");
  }

  const row = await db
    .select({ userId: aiChatThreads.userId })
    .from(aiChatThreads)
    .where(eq(aiChatThreads.id, params.threadId))
    .limit(1);

  if (!row[0] || row[0].userId !== params.userId) {
    throw new Error("RESOURCE_NOT_FOUND");
  }
}

export function _resetAiChatPersistenceForTests(): void {
  memThreadsByKey.clear();
}
