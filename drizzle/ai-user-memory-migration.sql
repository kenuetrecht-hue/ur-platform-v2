-- AI user memory (hive long-term context)
CREATE TABLE IF NOT EXISTS `aiUserMemoryProfiles` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(128) NOT NULL,
  `creatorId` varchar(64) NOT NULL,
  `communicationStyle` varchar(16) DEFAULT 'friendly',
  `recentTopicsJson` text,
  `totalInteractions` int NOT NULL DEFAULT 0,
  `lastInteractionAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `aiUserMemoryProfiles_user_creator` (`userId`, `creatorId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `aiUserMemoryEntries` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(128) NOT NULL,
  `creatorId` varchar(64) NOT NULL,
  `userMessage` text NOT NULL,
  `aiResponse` text NOT NULL,
  `sentiment` varchar(16) DEFAULT 'neutral',
  `topicsJson` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aiUserMemoryEntries_user_creator` (`userId`, `creatorId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
