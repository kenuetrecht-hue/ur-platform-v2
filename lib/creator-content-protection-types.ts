import type { ContentLicenseType, ContentRightsMode } from "./creator-content-protection-core";

export type RegisteredCreatorIdentity = {
  userId: string;
  displayName: string;
  normalizedName: string;
  enrolledAt: string;
  verified: boolean;
};

export type ContentAssetRecord = {
  assetId: string;
  ownerUserId: string;
  contentHash: string;
  source: "social_post" | "creator_profile";
  sourceId: string;
  bodyPreview: string;
  contentRightsMode: ContentRightsMode;
  attributionSourceName?: string;
  licenseType?: ContentLicenseType;
  registeredAt: string;
};

export type ProtectionReport = {
  id: string;
  reporterUserId: string;
  reportType: "impersonation" | "content_theft" | "unauthorized_repost";
  subjectUserId: string;
  relatedAssetId?: string;
  description: string;
  status: "open" | "confirmed" | "dismissed";
  createdAt: string;
  reviewedAt?: string;
  reviewedByOwnerId?: string;
};

export type UserStrikeRecord = {
  userId: string;
  strikeCount: number;
  publishBlocked: boolean;
  lastStrikeAt?: string;
  terminatedAt?: string;
};
