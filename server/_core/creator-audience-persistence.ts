/**
 * MySQL persistence for enrolled creators and fan-owned follows / paid subs.
 * In-memory maps stay the request source of truth; DB is best-effort.
 */

import { eq } from "drizzle-orm";
import {
  contentCreatorProfiles,
  creatorChannelFollows,
  creatorPaidChannelSubs,
} from "../../drizzle/schema";
import { getDb } from "../db";
import type { CreatorFollow, CreatorPaidSubscription } from "./creator-audience-service";

function skipPersistence(): boolean {
  return process.env.VITEST === "true" || process.env.NODE_ENV === "test";
}

export type PersistedCreatorProfile = {
  userId: string;
  userEmail: string;
  displayName: string;
  customSlug: string;
  customUrl: string;
  enrolledAt: string;
  launchSlot: number | null;
  referredByAffiliateUserId?: string;
  referredByAffiliateCode?: string;
  freeServiceEndsAt: string | null;
};

export async function loadCreatorRosterFromDb(): Promise<{
  creators: PersistedCreatorProfile[];
  follows: CreatorFollow[];
  paidSubs: CreatorPaidSubscription[];
}> {
  const db = await getDb();
  if (!db) {
    return { creators: [], follows: [], paidSubs: [] };
  }

  try {
    const [creatorRows, followRows, paidRows] = await Promise.all([
      db.select().from(contentCreatorProfiles),
      db.select().from(creatorChannelFollows),
      db.select().from(creatorPaidChannelSubs),
    ]);

    return {
      creators: creatorRows.map((row) => ({
        userId: row.userId,
        userEmail: row.userEmail,
        displayName: row.displayName,
        customSlug: row.customSlug,
        customUrl: row.customUrl,
        enrolledAt: row.enrolledAt.toISOString(),
        launchSlot: row.launchSlot,
        referredByAffiliateUserId: row.referredByAffiliateUserId ?? undefined,
        referredByAffiliateCode: row.referredByAffiliateCode ?? undefined,
        freeServiceEndsAt: row.freeServiceEndsAt?.toISOString() ?? null,
      })),
      follows: followRows.map((row) => ({
        followerUserId: row.followerUserId,
        creatorUserId: row.creatorUserId,
        followedAt: row.followedAt.toISOString(),
      })),
      paidSubs: paidRows.map((row) => ({
        subscriberUserId: row.subscriberUserId,
        creatorUserId: row.creatorUserId,
        subscribedAt: row.subscribedAt.toISOString(),
      })),
    };
  } catch (error) {
    console.warn("[creator-audience] load from DB failed:", error);
    return { creators: [], follows: [], paidSubs: [] };
  }
}

export async function persistContentCreatorProfile(profile: PersistedCreatorProfile): Promise<void> {
  if (skipPersistence()) return;
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .insert(contentCreatorProfiles)
      .values({
        userId: profile.userId,
        userEmail: profile.userEmail,
        displayName: profile.displayName,
        customSlug: profile.customSlug,
        customUrl: profile.customUrl,
        enrolledAt: new Date(profile.enrolledAt),
        launchSlot: profile.launchSlot,
        referredByAffiliateUserId: profile.referredByAffiliateUserId,
        referredByAffiliateCode: profile.referredByAffiliateCode,
        freeServiceEndsAt: profile.freeServiceEndsAt ? new Date(profile.freeServiceEndsAt) : null,
      })
      .onDuplicateKeyUpdate({
        set: {
          userEmail: profile.userEmail,
          displayName: profile.displayName,
          customSlug: profile.customSlug,
          customUrl: profile.customUrl,
          launchSlot: profile.launchSlot,
        },
      });
  } catch (error) {
    console.warn("[creator-audience] persist creator failed:", error);
  }
}

export async function persistCreatorFollow(record: CreatorFollow): Promise<void> {
  if (skipPersistence()) return;
  const db = await getDb();
  if (!db) return;
  const id = `${record.followerUserId}:${record.creatorUserId}`;

  try {
    await db
      .insert(creatorChannelFollows)
      .values({
        id,
        followerUserId: record.followerUserId,
        creatorUserId: record.creatorUserId,
        followedAt: new Date(record.followedAt),
      })
      .onDuplicateKeyUpdate({
        set: { followedAt: new Date(record.followedAt) },
      });
  } catch (error) {
    console.warn("[creator-audience] persist follow failed:", error);
  }
}

export async function deleteCreatorFollow(followerUserId: string, creatorUserId: string): Promise<void> {
  if (skipPersistence()) return;
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .delete(creatorChannelFollows)
      .where(eq(creatorChannelFollows.id, `${followerUserId}:${creatorUserId}`));
  } catch (error) {
    console.warn("[creator-audience] delete follow failed:", error);
  }
}

export async function persistPaidChannelSub(record: CreatorPaidSubscription): Promise<void> {
  if (skipPersistence()) return;
  const db = await getDb();
  if (!db) return;
  const id = `${record.subscriberUserId}:${record.creatorUserId}`;

  try {
    await db
      .insert(creatorPaidChannelSubs)
      .values({
        id,
        subscriberUserId: record.subscriberUserId,
        creatorUserId: record.creatorUserId,
        subscribedAt: new Date(record.subscribedAt),
      })
      .onDuplicateKeyUpdate({
        set: { subscribedAt: new Date(record.subscribedAt) },
      });
  } catch (error) {
    console.warn("[creator-audience] persist paid sub failed:", error);
  }
}

export async function deletePaidChannelSub(subscriberUserId: string, creatorUserId: string): Promise<void> {
  if (skipPersistence()) return;
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .delete(creatorPaidChannelSubs)
      .where(eq(creatorPaidChannelSubs.id, `${subscriberUserId}:${creatorUserId}`));
  } catch (error) {
    console.warn("[creator-audience] delete paid sub failed:", error);
  }
}
