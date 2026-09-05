-- Enrolled creators + live follower / paid-subscriber ledger
-- Run via: pnpm db:setup (or node scripts/run-all-migrations.js)

CREATE TABLE IF NOT EXISTS `contentCreatorProfiles` (
  `userId` varchar(128) NOT NULL,
  `userEmail` varchar(320) NOT NULL,
  `displayName` varchar(80) NOT NULL,
  `customSlug` varchar(64) NOT NULL,
  `customUrl` varchar(500) NOT NULL,
  `enrolledAt` timestamp NOT NULL,
  `launchSlot` int NULL,
  `referredByAffiliateUserId` varchar(128),
  `referredByAffiliateCode` varchar(64),
  `freeServiceEndsAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `contentCreatorProfiles_userId` PRIMARY KEY(`userId`),
  KEY `contentCreatorProfiles_enrolledAt_idx` (`enrolledAt`)
);

CREATE TABLE IF NOT EXISTS `creatorChannelFollows` (
  `id` varchar(260) NOT NULL,
  `followerUserId` varchar(128) NOT NULL,
  `creatorUserId` varchar(128) NOT NULL,
  `followedAt` timestamp NOT NULL,
  CONSTRAINT `creatorChannelFollows_id` PRIMARY KEY(`id`),
  KEY `creatorChannelFollows_creator_idx` (`creatorUserId`)
);

CREATE TABLE IF NOT EXISTS `creatorPaidChannelSubs` (
  `id` varchar(260) NOT NULL,
  `subscriberUserId` varchar(128) NOT NULL,
  `creatorUserId` varchar(128) NOT NULL,
  `subscribedAt` timestamp NOT NULL,
  CONSTRAINT `creatorPaidChannelSubs_id` PRIMARY KEY(`id`),
  KEY `creatorPaidChannelSubs_creator_idx` (`creatorUserId`)
);
