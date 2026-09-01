-- Owner Command Center + platform ops persistence (survives server restart)
-- Run via: pnpm db:setup (or node scripts/run-all-migrations.js)

CREATE TABLE IF NOT EXISTS `ownerCommandCenterEvents` (
  `id` varchar(64) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `kind` varchar(32) NOT NULL,
  `severity` varchar(16) NOT NULL,
  `sourceAiId` varchar(64) NOT NULL,
  `sourceAiName` varchar(120) NOT NULL,
  `english` text NOT NULL,
  `terminalLine` varchar(255) NOT NULL,
  `relatedAiIdsJson` text,
  `relatedAiNamesJson` text,
  `incidentId` varchar(64),
  `sectionId` varchar(64),
  `userIdSuffix` varchar(16),
  `translated` boolean NOT NULL DEFAULT false,
  `originalExcerpt` text,
  CONSTRAINT `ownerCommandCenterEvents_id` PRIMARY KEY (`id`),
  KEY `ownerCommandCenterEvents_createdAt_idx` (`createdAt`),
  KEY `ownerCommandCenterEvents_kind_idx` (`kind`),
  KEY `ownerCommandCenterEvents_incidentId_idx` (`incidentId`)
);

CREATE TABLE IF NOT EXISTS `platformOpsIncidents` (
  `id` varchar(64) NOT NULL,
  `sourceAi` varchar(64) NOT NULL,
  `severity` varchar(16) NOT NULL,
  `category` varchar(32) NOT NULL,
  `title` varchar(240) NOT NULL,
  `problem` text NOT NULL,
  `proposedFix` text NOT NULL,
  `status` varchar(32) NOT NULL,
  `actionsTakenJson` text,
  `deployProposalJson` text,
  `remediationResultsJson` text,
  `sandboxRepairJson` text,
  `affectedSectionId` varchar(64),
  `sectionAction` varchar(16),
  `autoIsolated` boolean NOT NULL DEFAULT false,
  `ownerApprovedAt` timestamp NULL,
  `ownerNote` text,
  `ownerInstructions` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `platformOpsIncidents_id` PRIMARY KEY (`id`),
  KEY `platformOpsIncidents_status_idx` (`status`),
  KEY `platformOpsIncidents_section_idx` (`affectedSectionId`)
);

CREATE TABLE IF NOT EXISTS `platformOpsNotifications` (
  `id` varchar(64) NOT NULL,
  `incidentId` varchar(64) NOT NULL,
  `title` varchar(240) NOT NULL,
  `content` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `read` boolean NOT NULL DEFAULT false,
  CONSTRAINT `platformOpsNotifications_id` PRIMARY KEY (`id`),
  KEY `platformOpsNotifications_incidentId_idx` (`incidentId`)
);

CREATE TABLE IF NOT EXISTS `platformSectionFlags` (
  `id` varchar(64) NOT NULL,
  `enabled` boolean NOT NULL DEFAULT true,
  `maintenanceMessage` varchar(500) NOT NULL,
  `disabledAt` timestamp NULL,
  `disabledBy` varchar(64),
  `incidentId` varchar(64),
  `reason` text,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `platformSectionFlags_id` PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `ownerPushDevices` (
  `token` varchar(255) NOT NULL,
  `ownerUserId` varchar(128) NOT NULL,
  `platform` varchar(16) NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `ownerPushDevices_token` PRIMARY KEY (`token`)
);

CREATE TABLE IF NOT EXISTS `platformOpsSandboxRepairs` (
  `id` varchar(64) NOT NULL,
  `incidentId` varchar(64) NOT NULL,
  `title` varchar(240) NOT NULL,
  `status` varchar(16) NOT NULL,
  `diagnosis` text NOT NULL,
  `planStepsJson` text,
  `liveActionsJson` text,
  `checksJson` text,
  `wouldTouchLiveJson` text,
  `appliedLive` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `platformOpsSandboxRepairs_id` PRIMARY KEY (`id`),
  KEY `platformOpsSandboxRepairs_incidentId_idx` (`incidentId`)
);
