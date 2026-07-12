CREATE TABLE `loyaltyPoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`totalPoints` int NOT NULL DEFAULT 0,
	`pointsEarnedToday` int NOT NULL DEFAULT 0,
	`lastEarnedDate` timestamp,
	`totalSignIns` int NOT NULL DEFAULT 0,
	`totalPointsEarned` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loyaltyPoints_id` PRIMARY KEY(`id`),
	CONSTRAINT `loyaltyPoints_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `loyaltyPointsAudit` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pointsAwarded` int NOT NULL,
	`transactionType` enum('sign_in','scratch_off_win','drawing_entry','admin_adjustment') NOT NULL,
	`scratchOffTicketId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyaltyPointsAudit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scratchOffTickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ticketNumber` varchar(32) NOT NULL,
	`status` enum('unrevealed','revealed','claimed') NOT NULL DEFAULT 'unrevealed',
	`prizeType` enum('loyalty_points','drawing_entry') NOT NULL,
	`loyaltyPointsReward` int,
	`drawingEntryCount` int DEFAULT 1,
	`revealedAt` timestamp,
	`claimedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scratchOffTickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `scratchOffTickets_ticketNumber_unique` UNIQUE(`ticketNumber`)
);
--> statement-breakpoint
CREATE TABLE `weeklyDrawingEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`drawingWeek` varchar(10) NOT NULL,
	`entryCount` int NOT NULL DEFAULT 1,
	`sourceType` enum('scratch_off','tier_1_lifetime','promotion','admin') NOT NULL,
	`sourceId` int,
	`isWinner` boolean NOT NULL DEFAULT false,
	`prizeDescription` text,
	`claimedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weeklyDrawingEntries_id` PRIMARY KEY(`id`)
);
