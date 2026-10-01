CREATE TABLE IF NOT EXISTS `creatorSocialPushLots` (
	`userId` varchar(128) NOT NULL,
	`planId` varchar(16) NOT NULL,
	`dailyCap` int NOT NULL,
	`expiresAt` varchar(40) NOT NULL,
	`usageDay` varchar(10) NOT NULL,
	`usedToday` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creatorSocialPushLots_userId` PRIMARY KEY(`userId`)
);
