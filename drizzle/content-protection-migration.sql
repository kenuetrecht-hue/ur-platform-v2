-- Creator content protection tables (anti-cloning, impersonation, DMCA strikes)
-- Run via: pnpm db:setup (or node scripts/run-all-migrations.js)

CREATE TABLE IF NOT EXISTS `creatorIdentityProfiles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` varchar(128) NOT NULL,
  `displayName` varchar(80) NOT NULL,
  `normalizedName` varchar(80) NOT NULL,
  `verified` boolean NOT NULL DEFAULT false,
  `enrolledAt` timestamp NOT NULL DEFAULT (now()),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `creatorIdentityProfiles_id` PRIMARY KEY(`id`),
  CONSTRAINT `creatorIdentityProfiles_userId_unique` UNIQUE(`userId`),
  CONSTRAINT `creatorIdentityProfiles_normalizedName_unique` UNIQUE(`normalizedName`)
);

CREATE TABLE IF NOT EXISTS `contentAssetFingerprints` (
  `id` varchar(36) NOT NULL,
  `ownerUserId` varchar(128) NOT NULL,
  `contentHash` varchar(64) NOT NULL,
  `source` enum('social_post','creator_profile') NOT NULL,
  `sourceId` varchar(128) NOT NULL,
  `bodyPreview` varchar(120),
  `contentRightsMode` enum('original','licensed_repost') NOT NULL DEFAULT 'original',
  `attributionSourceName` varchar(80),
  `licenseType` varchar(32),
  `registeredAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `contentAssetFingerprints_id` PRIMARY KEY(`id`),
  CONSTRAINT `contentAssetFingerprints_contentHash_unique` UNIQUE(`contentHash`),
  KEY `contentAssetFingerprints_ownerUserId_idx` (`ownerUserId`)
);

CREATE TABLE IF NOT EXISTS `creatorInfringementStrikes` (
  `userId` varchar(128) NOT NULL,
  `strikeCount` int NOT NULL DEFAULT 0,
  `publishBlocked` boolean NOT NULL DEFAULT false,
  `lastStrikeAt` timestamp NULL,
  `terminatedAt` timestamp NULL,
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `creatorInfringementStrikes_userId` PRIMARY KEY(`userId`)
);

CREATE TABLE IF NOT EXISTS `contentProtectionReports` (
  `id` varchar(36) NOT NULL,
  `reporterUserId` varchar(128) NOT NULL,
  `subjectUserId` varchar(128) NOT NULL,
  `reportType` enum('impersonation','content_theft','unauthorized_repost') NOT NULL,
  `relatedAssetId` varchar(36),
  `description` text NOT NULL,
  `status` enum('open','confirmed','dismissed') NOT NULL DEFAULT 'open',
  `reviewedByOwnerId` varchar(128),
  `reviewedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `contentProtectionReports_id` PRIMARY KEY(`id`),
  KEY `contentProtectionReports_status_idx` (`status`)
);
