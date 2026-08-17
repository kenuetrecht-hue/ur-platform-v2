/**
 * MySQL persistence for creator content protection (best-effort; in-memory cache remains source during request).
 */

import { eq } from "drizzle-orm";
import {
  contentAssetFingerprints,
  contentProtectionReports,
  creatorIdentityProfiles,
  creatorInfringementStrikes,
} from "../../drizzle/schema";
import { getDb } from "../db";
import type {
  ContentAssetRecord,
  ProtectionReport,
  RegisteredCreatorIdentity,
  UserStrikeRecord,
} from "../../lib/creator-content-protection-types";

export async function loadContentProtectionFromDb(): Promise<{
  identities: RegisteredCreatorIdentity[];
  assets: ContentAssetRecord[];
  strikes: UserStrikeRecord[];
  reports: ProtectionReport[];
}> {
  const db = await getDb();
  if (!db) {
    return { identities: [], assets: [], strikes: [], reports: [] };
  }

  try {
    const [identityRows, assetRows, strikeRows, reportRows] = await Promise.all([
      db.select().from(creatorIdentityProfiles),
      db.select().from(contentAssetFingerprints),
      db.select().from(creatorInfringementStrikes),
      db.select().from(contentProtectionReports),
    ]);

    return {
      identities: identityRows.map((row) => ({
        userId: row.userId,
        displayName: row.displayName,
        normalizedName: row.normalizedName,
        enrolledAt: row.enrolledAt.toISOString(),
        verified: row.verified,
      })),
      assets: assetRows.map((row) => ({
        assetId: row.id,
        ownerUserId: row.ownerUserId,
        contentHash: row.contentHash,
        source: row.source,
        sourceId: row.sourceId,
        bodyPreview: row.bodyPreview ?? "",
        contentRightsMode: row.contentRightsMode,
        attributionSourceName: row.attributionSourceName ?? undefined,
        licenseType: (row.licenseType as ContentAssetRecord["licenseType"]) ?? undefined,
        registeredAt: row.registeredAt.toISOString(),
      })),
      strikes: strikeRows.map((row) => ({
        userId: row.userId,
        strikeCount: row.strikeCount,
        publishBlocked: row.publishBlocked,
        lastStrikeAt: row.lastStrikeAt?.toISOString(),
        terminatedAt: row.terminatedAt?.toISOString(),
      })),
      reports: reportRows.map((row) => ({
        id: row.id,
        reporterUserId: row.reporterUserId,
        reportType: row.reportType,
        subjectUserId: row.subjectUserId,
        relatedAssetId: row.relatedAssetId ?? undefined,
        description: row.description,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        reviewedAt: row.reviewedAt?.toISOString(),
        reviewedByOwnerId: row.reviewedByOwnerId ?? undefined,
      })),
    };
  } catch (error) {
    console.warn("[content-protection] load from DB failed:", error);
    return { identities: [], assets: [], strikes: [], reports: [] };
  }
}

export async function persistCreatorIdentity(record: RegisteredCreatorIdentity): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .insert(creatorIdentityProfiles)
      .values({
        userId: record.userId,
        displayName: record.displayName,
        normalizedName: record.normalizedName,
        verified: record.verified,
        enrolledAt: new Date(record.enrolledAt),
      })
      .onDuplicateKeyUpdate({
        set: {
          displayName: record.displayName,
          normalizedName: record.normalizedName,
          verified: record.verified,
        },
      });
  } catch (error) {
    console.warn("[content-protection] persist identity failed:", error);
  }
}

export async function persistContentAsset(record: ContentAssetRecord): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .insert(contentAssetFingerprints)
      .values({
        id: record.assetId,
        ownerUserId: record.ownerUserId,
        contentHash: record.contentHash,
        source: record.source,
        sourceId: record.sourceId,
        bodyPreview: record.bodyPreview,
        contentRightsMode: record.contentRightsMode,
        attributionSourceName: record.attributionSourceName,
        licenseType: record.licenseType,
        registeredAt: new Date(record.registeredAt),
      })
      .onDuplicateKeyUpdate({
        set: {
          bodyPreview: record.bodyPreview,
          contentRightsMode: record.contentRightsMode,
          attributionSourceName: record.attributionSourceName,
          licenseType: record.licenseType,
        },
      });
  } catch (error) {
    console.warn("[content-protection] persist asset failed:", error);
  }
}

export async function persistUserStrikes(record: UserStrikeRecord): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .insert(creatorInfringementStrikes)
      .values({
        userId: record.userId,
        strikeCount: record.strikeCount,
        publishBlocked: record.publishBlocked,
        lastStrikeAt: record.lastStrikeAt ? new Date(record.lastStrikeAt) : null,
        terminatedAt: record.terminatedAt ? new Date(record.terminatedAt) : null,
      })
      .onDuplicateKeyUpdate({
        set: {
          strikeCount: record.strikeCount,
          publishBlocked: record.publishBlocked,
          lastStrikeAt: record.lastStrikeAt ? new Date(record.lastStrikeAt) : null,
          terminatedAt: record.terminatedAt ? new Date(record.terminatedAt) : null,
        },
      });
  } catch (error) {
    console.warn("[content-protection] persist strikes failed:", error);
  }
}

export async function persistProtectionReport(record: ProtectionReport): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .insert(contentProtectionReports)
      .values({
        id: record.id,
        reporterUserId: record.reporterUserId,
        subjectUserId: record.subjectUserId,
        reportType: record.reportType,
        relatedAssetId: record.relatedAssetId,
        description: record.description,
        status: record.status,
        reviewedByOwnerId: record.reviewedByOwnerId,
        reviewedAt: record.reviewedAt ? new Date(record.reviewedAt) : null,
        createdAt: new Date(record.createdAt),
      })
      .onDuplicateKeyUpdate({
        set: {
          status: record.status,
          reviewedByOwnerId: record.reviewedByOwnerId,
          reviewedAt: record.reviewedAt ? new Date(record.reviewedAt) : null,
        },
      });
  } catch (error) {
    console.warn("[content-protection] persist report failed:", error);
  }
}

export async function findContentHashOwnerFromDb(contentHash: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const rows = await db
      .select({ ownerUserId: contentAssetFingerprints.ownerUserId })
      .from(contentAssetFingerprints)
      .where(eq(contentAssetFingerprints.contentHash, contentHash))
      .limit(1);
    return rows[0]?.ownerUserId ?? null;
  } catch {
    return null;
  }
}
