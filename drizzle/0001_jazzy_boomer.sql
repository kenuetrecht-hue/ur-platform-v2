CREATE TABLE `termsAcceptance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`termsVersionId` int NOT NULL,
	`type` enum('user','creator','payment') NOT NULL,
	`acceptedAt` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `termsAcceptance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `termsVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`version` varchar(20) NOT NULL,
	`title` varchar(255) NOT NULL,
	`type` enum('user','creator','payment') NOT NULL,
	`content` text NOT NULL,
	`effectiveDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `termsVersions_id` PRIMARY KEY(`id`),
	CONSTRAINT `termsVersions_version_unique` UNIQUE(`version`)
);
