CREATE TABLE IF NOT EXISTS `contentCreatorProfiles` (
	`userId` varchar(128) NOT NULL,
	`userEmail` varchar(320) NOT NULL,
	`displayName` varchar(80) NOT NULL,
	`customSlug` varchar(64) NOT NULL,
	`customUrl` varchar(500) NOT NULL,
	`enrolledAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`launchSlot` int,
	`referredByAffiliateUserId` varchar(128),
	`referredByAffiliateCode` varchar(64),
	`freeServiceEndsAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contentCreatorProfiles_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `creatorChannelFollows` (
	`id` varchar(260) NOT NULL,
	`followerUserId` varchar(128) NOT NULL,
	`creatorUserId` varchar(128) NOT NULL,
	`followedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `creatorChannelFollows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `creatorPaidChannelSubs` (
	`id` varchar(260) NOT NULL,
	`subscriberUserId` varchar(128) NOT NULL,
	`creatorUserId` varchar(128) NOT NULL,
	`subscribedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `creatorPaidChannelSubs_id` PRIMARY KEY(`id`)
);
