CREATE TABLE `aiChatThreads` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`creatorId` varchar(64) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiChatThreads_id` PRIMARY KEY(`id`),
	CONSTRAINT `aiChatThreads_user_creator` UNIQUE(`userId`,`creatorId`)
);
--> statement-breakpoint
CREATE TABLE `aiChatMessages` (
	`id` varchar(36) NOT NULL,
	`threadId` varchar(36) NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiChatMessages_id` PRIMARY KEY(`id`)
);
