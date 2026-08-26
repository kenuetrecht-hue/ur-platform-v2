/**
 * MySQL persistence for AI user memory (hive long-term context).
 */

import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { aiUserMemoryEntries, aiUserMemoryProfiles } from "../../drizzle/schema";
import { getDb } from "../db";
import { aiUserMemoryService } from "../../lib/ai-user-memory-service";

const MAX_HYDRATED_ENTRIES = 30;

const hydratedKeys = new Set<string>();

function memoryKey(userId: string, creatorId: string): string {
  return `${userId}_${creatorId}`;
}

export async function ensureUserMemoryHydrated(
  userId: string,
  creatorId: string,
): Promise<void> {
  const key = memoryKey(userId, creatorId);
  if (hydratedKeys.has(key)) return;

  const db = await getDb();
  if (!db) {
    hydratedKeys.add(key);
    return;
  }

  try {
    const [profileRow] = await db
      .select()
      .from(aiUserMemoryProfiles)
      .where(
        and(
          eq(aiUserMemoryProfiles.userId, userId),
          eq(aiUserMemoryProfiles.creatorId, creatorId),
        ),
      )
      .limit(1);

    aiUserMemoryService.initializeUser(userId, creatorId, "User");

    if (profileRow) {
      const profile = aiUserMemoryService.getUserProfile(userId, creatorId);
      if (profile) {
        profile.totalInteractions = profileRow.totalInteractions;
        profile.lastInteractionDate = profileRow.lastInteractionAt ?? profile.lastInteractionDate;
        if (profileRow.communicationStyle) {
          profile.preferences.communicationStyle =
            profileRow.communicationStyle as typeof profile.preferences.communicationStyle;
        }
        try {
          const topics = profileRow.recentTopicsJson
            ? (JSON.parse(profileRow.recentTopicsJson) as string[])
            : [];
          if (Array.isArray(topics)) {
            profile.preferences.contentPreferences = topics.slice(0, 20);
          }
        } catch {
          /* ignore malformed JSON */
        }
      }
    }

    const entryRows = await db
      .select()
      .from(aiUserMemoryEntries)
      .where(
        and(
          eq(aiUserMemoryEntries.userId, userId),
          eq(aiUserMemoryEntries.creatorId, creatorId),
        ),
      )
      .orderBy(desc(aiUserMemoryEntries.createdAt))
      .limit(MAX_HYDRATED_ENTRIES);

    for (const row of entryRows.reverse()) {
      aiUserMemoryService.recordConversation(
        userId,
        creatorId,
        row.userMessage,
        row.aiResponse,
        (row.sentiment as "positive" | "neutral" | "negative") ?? "neutral",
      );
    }

    hydratedKeys.add(key);
  } catch (error) {
    console.warn("[ai-user-memory] hydrate failed:", error);
    hydratedKeys.add(key);
  }
}

export async function persistUserMemoryInteraction(params: {
  userId: string;
  creatorId: string;
  userMessage: string;
  aiReply: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const context = aiUserMemoryService.getUserMemoryContext(params.userId, params.creatorId);
    const preferenceTags = aiUserMemoryService.getPersistedPreferenceTags(
      params.userId,
      params.creatorId,
    );
    const topicsJson = JSON.stringify(
      [...preferenceTags, ...context.recentTopics].slice(0, 24),
    );

    const [existing] = await db
      .select({ id: aiUserMemoryProfiles.id })
      .from(aiUserMemoryProfiles)
      .where(
        and(
          eq(aiUserMemoryProfiles.userId, params.userId),
          eq(aiUserMemoryProfiles.creatorId, params.creatorId),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(aiUserMemoryProfiles)
        .set({
          communicationStyle: context.preferredResponseStyle.slice(0, 16) || "friendly",
          recentTopicsJson: topicsJson,
          totalInteractions: context.conversationHistory.length,
          lastInteractionAt: new Date(),
        })
        .where(eq(aiUserMemoryProfiles.id, existing.id));
    } else {
      await db.insert(aiUserMemoryProfiles).values({
        id: randomUUID(),
        userId: params.userId,
        creatorId: params.creatorId,
        communicationStyle: context.preferredResponseStyle.slice(0, 16) || "friendly",
        recentTopicsJson: topicsJson,
        totalInteractions: 1,
        lastInteractionAt: new Date(),
      });
    }

    await db.insert(aiUserMemoryEntries).values({
      id: randomUUID(),
      userId: params.userId,
      creatorId: params.creatorId,
      userMessage: params.userMessage.slice(0, 4000),
      aiResponse: params.aiReply.slice(0, 4000),
      sentiment: "neutral",
      topicsJson,
    });

    const oldRows = await db
      .select({ id: aiUserMemoryEntries.id })
      .from(aiUserMemoryEntries)
      .where(
        and(
          eq(aiUserMemoryEntries.userId, params.userId),
          eq(aiUserMemoryEntries.creatorId, params.creatorId),
        ),
      )
      .orderBy(desc(aiUserMemoryEntries.createdAt))
      .offset(100);

    for (const row of oldRows) {
      await db.delete(aiUserMemoryEntries).where(eq(aiUserMemoryEntries.id, row.id));
    }
  } catch (error) {
    console.warn("[ai-user-memory] persist failed:", error);
  }
}

/** Warm memory cache for active users on server boot (best-effort). */
export async function hydrateRecentAiUserMemory(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const rows = await db
      .select()
      .from(aiUserMemoryProfiles)
      .orderBy(desc(aiUserMemoryProfiles.lastInteractionAt))
      .limit(50);

    for (const row of rows) {
      await ensureUserMemoryHydrated(row.userId, row.creatorId);
    }
  } catch (error) {
    console.warn("[ai-user-memory] boot hydrate failed:", error);
  }
}
