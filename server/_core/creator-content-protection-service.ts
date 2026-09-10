/**
 * Creator content protection — anti-cloning, impersonation, and repeat-infringer enforcement.
 * Registers content fingerprints, blocks duplicate posts, and queues abuse reports for owner review.
 */

import { createHash, randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import {
  buildContentFingerprintPayload,
  findImpersonationMatch,
  IMPERSONATION_NAME_THRESHOLD,
  isReservedCreatorName,
  NEAR_DUPLICATE_TEXT_THRESHOLD,
  normalizeDisplayName,
  PUBLISH_BLOCK_STRIKE_THRESHOLD,
  textSimilarity,
  validateLicensedRepost,
  type ContentLicenseType,
  type ContentProtectionBlockReason,
  type ContentRightsMode,
  type ImpersonationMatch,
} from "../../lib/creator-content-protection-core";
import { sanitizeUserText } from "./input-sanitize";
import type {
  ContentAssetRecord,
  ProtectionReport,
  RegisteredCreatorIdentity,
  UserStrikeRecord,
} from "../../lib/creator-content-protection-types";
import {
  loadContentProtectionFromDb,
  persistContentAsset,
  persistCreatorIdentity,
  persistProtectionReport,
  persistUserStrikes,
} from "./content-protection-persistence";

export class ContentProtectionError extends Error {
  readonly code: ContentProtectionBlockReason;

  constructor(code: ContentProtectionBlockReason, message: string) {
    super(message);
    this.name = "ContentProtectionError";
    this.code = code;
  }
}

export function mapContentProtectionError(error: unknown): never {
  if (error instanceof ContentProtectionError) {
    throw new TRPCError({
      code: error.code === "publish_blocked" ? "FORBIDDEN" : "BAD_REQUEST",
      message: error.message,
    });
  }
  throw error;
}

export type { ImpersonationMatch };
export type {
  ContentAssetRecord,
  ProtectionReport,
  RegisteredCreatorIdentity,
  UserStrikeRecord,
} from "../../lib/creator-content-protection-types";

const creatorIdentities = new Map<string, RegisteredCreatorIdentity>();
const contentByHash = new Map<string, ContentAssetRecord>();
const contentByOwner = new Map<string, ContentAssetRecord[]>();
const userStrikes = new Map<string, UserStrikeRecord>();
const reports = new Map<string, ProtectionReport>();
/** Users who passed 18+ KYC — names lock even if they have not posted yet. */
const kycVerifiedUserIds = new Set<string>();
const reportsByReporterDay = new Map<string, { count: number; dayKey: string }>();

const MAX_PROTECTION_REPORTS_PER_DAY = 8;

function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function previewText(text: string): string {
  return sanitizeUserText(text, 120);
}

export function hashContentPayload(payload: string): string {
  return sha256(payload);
}

export function registerCreatorIdentity(params: {
  userId: string;
  displayName: string;
  verified?: boolean;
}): RegisteredCreatorIdentity {
  const displayName = sanitizeUserText(params.displayName, 80);
  const normalizedName = normalizeDisplayName(displayName);
  const existing = creatorIdentities.get(params.userId);

  if (isReservedCreatorName(displayName)) {
    throw new ContentProtectionError(
      "reserved_name",
      "This display name is reserved for the UR Platform. Choose a unique creator name.",
    );
  }

  if (existing?.verified && existing.normalizedName !== normalizedName) {
    throw new ContentProtectionError(
      "verified_name_locked",
      "Your verified creator name is locked after ID verification so nobody can take it over. Email ken.uetrecht.ur@gmail.com if you need a change.",
    );
  }

  const impersonation = findImpersonationMatch(
    displayName,
    [...creatorIdentities.values()],
    params.userId,
    IMPERSONATION_NAME_THRESHOLD,
  );
  if (impersonation) {
    throw new ContentProtectionError(
      "impersonation",
      "This name is too similar to an existing creator. Choose a distinct name so audiences are not misled.",
    );
  }

  const record: RegisteredCreatorIdentity = {
    userId: params.userId,
    displayName,
    normalizedName,
    enrolledAt: existing?.enrolledAt ?? new Date().toISOString(),
    verified: params.verified ?? existing?.verified ?? kycVerifiedUserIds.has(params.userId),
  };
  creatorIdentities.set(params.userId, record);
  void persistCreatorIdentity(record);
  return record;
}

/** Marks the account ID-verified. Locks display name on the next profile save. */
export function markCreatorIdentityVerified(userId: string): RegisteredCreatorIdentity | null {
  const id = String(userId);
  kycVerifiedUserIds.add(id);
  const existing = creatorIdentities.get(id);
  if (!existing) return null;
  if (existing.verified) return existing;
  existing.verified = true;
  creatorIdentities.set(id, existing);
  void persistCreatorIdentity(existing);
  return existing;
}

export function getCreatorIdentity(userId: string): RegisteredCreatorIdentity | null {
  return creatorIdentities.get(userId) ?? null;
}

export function assertPublicHandleAllowed(params: {
  userId: string;
  handle: string;
}): void {
  const handle = sanitizeUserText(params.handle, 64);
  if (isReservedCreatorName(handle)) {
    throw new ContentProtectionError(
      "reserved_name",
      "This public link is reserved for the UR Platform.",
    );
  }
  const impersonation = findImpersonationMatch(
    handle.replace(/-/g, " "),
    [...creatorIdentities.values()],
    params.userId,
    IMPERSONATION_NAME_THRESHOLD,
  );
  if (impersonation) {
    throw new ContentProtectionError(
      "lookalike_handle",
      "This public link is too similar to another creator. Choose a distinct handle.",
    );
  }
}

export function assertCreatorDisplayNameAllowed(params: {
  userId: string;
  displayName: string;
}): void {
  const displayName = sanitizeUserText(params.displayName, 80);
  if (isReservedCreatorName(displayName)) {
    throw new ContentProtectionError(
      "reserved_name",
      "This display name is reserved for the UR Platform.",
    );
  }

  const impersonation = findImpersonationMatch(
    displayName,
    [...creatorIdentities.values()],
    params.userId,
    IMPERSONATION_NAME_THRESHOLD,
  );
  if (impersonation) {
    throw new ContentProtectionError(
      "impersonation",
      "This name is too similar to another creator on UR Platform.",
    );
  }
}

export function assertUserCanPublish(userId: string): void {
  const strikes = userStrikes.get(userId);
  if (strikes?.publishBlocked) {
    throw new ContentProtectionError(
      "publish_blocked",
      "Publishing is paused on this account due to repeated content violations. Contact UR Platform support.",
    );
  }
}

export function assertContentRights(params: {
  contentRightsMode: ContentRightsMode;
  rightsConfirmed: boolean | undefined;
  attributionSourceName?: string;
  attributionSourceUrl?: string;
  licenseType?: ContentLicenseType;
}): void {
  if (!params.rightsConfirmed) {
    throw new ContentProtectionError(
      "rights_attestation_required",
      "Confirm your content rights before publishing.",
    );
  }

  if (params.contentRightsMode === "original") {
    return;
  }

  if (!params.attributionSourceName?.trim() || !params.licenseType) {
    throw new ContentProtectionError(
      "repost_attribution_required",
      "Licensed reposts require the original creator/source name and license type.",
    );
  }

  const validation = validateLicensedRepost({
    attributionSourceName: params.attributionSourceName,
    attributionSourceUrl: params.attributionSourceUrl,
    licenseType: params.licenseType,
  });
  if (!validation.ok) {
    throw new ContentProtectionError("repost_attribution_required", validation.message);
  }
}

/** @deprecated Use assertContentRights */
export function assertRightsAttestation(ownsOrLicensedContent: boolean | undefined): void {
  assertContentRights({
    contentRightsMode: "original",
    rightsConfirmed: ownsOrLicensedContent,
  });
}

function findNearDuplicate(params: {
  ownerUserId: string;
  body: string;
  excludeSourceId?: string;
}): ContentAssetRecord | null {
  const normalizedBody = sanitizeUserText(params.body, 4000);
  if (!normalizedBody.trim()) return null;

  for (const asset of contentByHash.values()) {
    if (asset.ownerUserId === params.ownerUserId) continue;
    if (params.excludeSourceId && asset.sourceId === params.excludeSourceId) continue;
    const similarity = textSimilarity(normalizedBody, asset.bodyPreview);
    if (similarity >= NEAR_DUPLICATE_TEXT_THRESHOLD) {
      return asset;
    }
  }
  return null;
}

export function registerAndVerifyContent(params: {
  ownerUserId: string;
  source: ContentAssetRecord["source"];
  sourceId: string;
  body: string;
  imageUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
  contentRightsMode?: ContentRightsMode;
  attributionSourceName?: string;
  attributionSourceUrl?: string;
  licenseType?: ContentLicenseType;
}): ContentAssetRecord {
  assertUserCanPublish(params.ownerUserId);

  const contentRightsMode = params.contentRightsMode ?? "original";
  assertContentRights({
    contentRightsMode,
    rightsConfirmed: true,
    attributionSourceName: params.attributionSourceName,
    attributionSourceUrl: params.attributionSourceUrl,
    licenseType: params.licenseType,
  });

  const body = sanitizeUserText(params.body, 4000);
  const payload = buildContentFingerprintPayload({
    body,
    imageUrl: params.imageUrl,
    videoUrl: params.videoUrl,
    linkUrl: params.linkUrl,
  });

  if (!payload.trim()) {
    throw new ContentProtectionError(
      "rights_attestation_required",
      "Add original text or media you have rights to publish.",
    );
  }

  const contentHash = hashContentPayload(
    contentRightsMode === "licensed_repost"
      ? `${payload}\nrepost:${params.attributionSourceName}:${params.licenseType}`
      : payload,
  );

  const existing = contentByHash.get(contentHash);
  if (contentRightsMode === "original") {
    if (existing && existing.ownerUserId !== params.ownerUserId) {
      throw new ContentProtectionError(
        "duplicate_content",
        "This content matches material already registered to another creator. To share it, use Licensed repost with credit and your license type.",
      );
    }

    const nearDuplicate = findNearDuplicate({
      ownerUserId: params.ownerUserId,
      body,
      excludeSourceId: params.sourceId,
    });
    if (nearDuplicate && nearDuplicate.ownerUserId !== params.ownerUserId) {
      throw new ContentProtectionError(
        "near_duplicate_content",
        "This post is too similar to another creator's content. To share public material, switch to Licensed repost and credit the source.",
      );
    }
  }

  const record: ContentAssetRecord = {
    assetId: randomUUID(),
    ownerUserId: params.ownerUserId,
    contentHash,
    source: params.source,
    sourceId: params.sourceId,
    bodyPreview: previewText(body || params.imageUrl || params.videoUrl || ""),
    contentRightsMode,
    attributionSourceName: params.attributionSourceName?.trim(),
    licenseType: params.licenseType,
    registeredAt: new Date().toISOString(),
  };

  contentByHash.set(contentHash, record);
  const ownerAssets = contentByOwner.get(params.ownerUserId) ?? [];
  ownerAssets.push(record);
  contentByOwner.set(params.ownerUserId, ownerAssets);
  void persistContentAsset(record);
  return record;
}

export function submitProtectionReport(params: {
  reporterUserId: string;
  reportType: ProtectionReport["reportType"];
  subjectUserId: string;
  description: string;
  relatedAssetId?: string;
}): ProtectionReport {
  const description = sanitizeUserText(params.description, 1000);
  if (description.length < 12) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Please describe the issue in at least 12 characters.",
    });
  }

  if (params.reporterUserId === params.subjectUserId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You cannot report your own account.",
    });
  }

  const dayKey = new Date().toISOString().slice(0, 10);
  const reporterKey = params.reporterUserId;
  const bucket = reportsByReporterDay.get(reporterKey);
  if (!bucket || bucket.dayKey !== dayKey) {
    reportsByReporterDay.set(reporterKey, { count: 1, dayKey });
  } else if (bucket.count >= MAX_PROTECTION_REPORTS_PER_DAY) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many reports today. Email ken.uetrecht.ur@gmail.com if this is urgent.",
    });
  } else {
    bucket.count += 1;
  }

  const report: ProtectionReport = {
    id: randomUUID(),
    reporterUserId: params.reporterUserId,
    reportType: params.reportType,
    subjectUserId: params.subjectUserId,
    relatedAssetId: params.relatedAssetId,
    description,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  reports.set(report.id, report);
  void persistProtectionReport(report);

  console.info("[content-protection] report filed", {
    reportId: report.id,
    reportType: report.reportType,
    subjectUserId: report.subjectUserId,
  });

  return report;
}

function applyStrike(userId: string): UserStrikeRecord {
  const existing = userStrikes.get(userId) ?? {
    userId,
    strikeCount: 0,
    publishBlocked: false,
  };
  existing.strikeCount += 1;
  existing.lastStrikeAt = new Date().toISOString();
  if (existing.strikeCount >= PUBLISH_BLOCK_STRIKE_THRESHOLD) {
    existing.publishBlocked = true;
    existing.terminatedAt = new Date().toISOString();
  }
  userStrikes.set(userId, existing);
  void persistUserStrikes(existing);
  return existing;
}

export function ownerReviewReport(params: {
  reportId: string;
  ownerUserId: string;
  decision: "confirmed" | "dismissed";
}): ProtectionReport {
  const report = reports.get(params.reportId);
  if (!report) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
  }
  if (report.status !== "open") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Report already reviewed." });
  }

  report.status = params.decision;
  report.reviewedAt = new Date().toISOString();
  report.reviewedByOwnerId = params.ownerUserId;
  reports.set(report.id, report);
  void persistProtectionReport(report);

  if (params.decision === "confirmed") {
    applyStrike(report.subjectUserId);
  }

  return report;
}

export function getUserProtectionStatus(userId: string): {
  strikes: UserStrikeRecord;
  identity: RegisteredCreatorIdentity | null;
  canPublish: boolean;
} {
  const strikes = userStrikes.get(userId) ?? {
    userId,
    strikeCount: 0,
    publishBlocked: false,
  };
  return {
    strikes,
    identity: creatorIdentities.get(userId) ?? null,
    canPublish: !strikes.publishBlocked,
  };
}

export function listOpenProtectionReports(limit = 50): ProtectionReport[] {
  return [...reports.values()]
    .filter((r) => r.status === "open")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function listCreatorIdentities(): RegisteredCreatorIdentity[] {
  return [...creatorIdentities.values()];
}

/** Test / admin reset — not exposed via router. */
export function __resetContentProtectionForTests(): void {
  creatorIdentities.clear();
  contentByHash.clear();
  contentByOwner.clear();
  userStrikes.clear();
  reports.clear();
  kycVerifiedUserIds.clear();
  reportsByReporterDay.clear();
  hydrateStarted = false;
}

let hydrateStarted = false;

/** Load fingerprints / identities from MySQL after server start. */
export async function hydrateContentProtectionFromDatabase(): Promise<void> {
  if (hydrateStarted) return;
  hydrateStarted = true;

  const data = await loadContentProtectionFromDb();
  for (const identity of data.identities) {
    creatorIdentities.set(identity.userId, identity);
    if (identity.verified) kycVerifiedUserIds.add(identity.userId);
  }
  for (const asset of data.assets) {
    contentByHash.set(asset.contentHash, asset);
    const ownerAssets = contentByOwner.get(asset.ownerUserId) ?? [];
    if (!ownerAssets.some((a) => a.assetId === asset.assetId)) {
      ownerAssets.push(asset);
      contentByOwner.set(asset.ownerUserId, ownerAssets);
    }
  }
  for (const strike of data.strikes) {
    userStrikes.set(strike.userId, strike);
  }
  for (const report of data.reports) {
    reports.set(report.id, report);
  }

  if (data.identities.length || data.assets.length) {
    console.info(
      `[content-protection] hydrated ${data.identities.length} identities, ${data.assets.length} fingerprints from DB`,
    );
  }
}
