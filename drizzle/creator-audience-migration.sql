-- Enrolled creators + live follower / paid-subscriber ledger
-- Run via: pnpm db:setup (or node scripts/run-all-migrations.js)
-- Compatible with MySQL 5.7+ / 8.x via CURRENT_TIMESTAMP defaults

CREATE TABLE IF NOT EXISTS `contentCreatorProfiles` (
  `userId` varchar(128) NOT NULL,
  `userEmail` varchar(320) NOT NULL,
  `displayName` varchar(80) NOT NULL,
  `customSlug` varchar(64) NOT NULL,
  `customUrl` varchar(500) NOT NULL,
  `enrolledAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `launchSlot` int NULL,
  `referredByAffiliateUserId` varchar(128),
  `referredByAffiliateCode` varchar(64),
  `freeServiceEndsAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`),
  KEY `contentCreatorProfiles_enrolledAt_idx` (`enrolledAt`),
  KEY `contentCreatorProfiles_customSlug_idx` (`customSlug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `creatorChannelFollows` (
  `id` varchar(260) NOT NULL,
  `followerUserId` varchar(128) NOT NULL,
  `creatorUserId` varchar(128) NOT NULL,
  `followedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `creatorChannelFollows_creator_idx` (`creatorUserId`),
  KEY `creatorChannelFollows_follower_idx` (`followerUserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `creatorPaidChannelSubs` (
  `id` varchar(260) NOT NULL,
  `subscriberUserId` varchar(128) NOT NULL,
  `creatorUserId` varchar(128) NOT NULL,
  `subscribedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `creatorPaidChannelSubs_creator_idx` (`creatorUserId`),
  KEY `creatorPaidChannelSubs_subscriber_idx` (`subscriberUserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
