CREATE TABLE IF NOT EXISTS `creatorVideoCallPrices` (
	`creatorUserId` varchar(128) NOT NULL,
	`priceCents` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creatorVideoCallPrices_creatorUserId` PRIMARY KEY(`creatorUserId`)
);
