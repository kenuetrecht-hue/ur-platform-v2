-- Posts, comments, likes, friends, and messages stay after a restart.

CREATE TABLE IF NOT EXISTS `urFeedPosts` (
  `id` varchar(64) NOT NULL,
  `authorUserId` varchar(128) NOT NULL,
  `authorName` varchar(80) NOT NULL,
  `authorAvatar` varchar(16) NOT NULL,
  `authorVerified` tinyint NOT NULL DEFAULT 0,
  `body` varchar(4000) NOT NULL,
  `kind` varchar(16) NOT NULL,
  `imageUrl` varchar(2000) NULL,
  `videoUrl` varchar(2000) NULL,
  `linkUrl` varchar(2000) NULL,
  `visibility` varchar(16) NOT NULL,
  `hashtags` varchar(500) NOT NULL,
  `shareCount` int NOT NULL DEFAULT 0,
  `hasAffiliateContent` tinyint NOT NULL DEFAULT 0,
  `hasAiDisclosure` tinyint NOT NULL DEFAULT 0,
  `contentRightsMode` varchar(32) NOT NULL,
  `attributionSourceName` varchar(80) NULL,
  `attributionSourceUrl` varchar(2000) NULL,
  `licenseType` varchar(64) NULL,
  `createdAt` varchar(40) NOT NULL,
  `updatedAt` varchar(40) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `urFeedPosts_created_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `urFeedComments` (
  `id` varchar(64) NOT NULL,
  `postId` varchar(64) NOT NULL,
  `authorUserId` varchar(128) NOT NULL,
  `authorName` varchar(80) NOT NULL,
  `body` varchar(1000) NOT NULL,
  `createdAt` varchar(40) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `urFeedComments_post_idx` (`postId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `urFeedLikes` (
  `postId` varchar(64) NOT NULL,
  `userId` varchar(128) NOT NULL,
  PRIMARY KEY (`postId`, `userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `urFriendships` (
  `id` varchar(64) NOT NULL,
  `userId` varchar(128) NOT NULL,
  `friendUserId` varchar(128) NOT NULL,
  `friendEmail` varchar(320) NOT NULL,
  `friendName` varchar(80) NOT NULL,
  `status` varchar(16) NOT NULL,
  `initiatedBy` varchar(128) NOT NULL,
  `createdAt` varchar(40) NOT NULL,
  `acceptedAt` varchar(40) NULL,
  PRIMARY KEY (`id`),
  KEY `urFriendships_user_idx` (`userId`),
  KEY `urFriendships_friend_idx` (`friendUserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `urDirectMessages` (
  `id` varchar(64) NOT NULL,
  `threadId` varchar(260) NOT NULL,
  `senderUserId` varchar(128) NOT NULL,
  `recipientUserId` varchar(128) NOT NULL,
  `body` varchar(2000) NOT NULL,
  `deliveredBody` varchar(2000) NULL,
  `subject` varchar(120) NULL,
  `senderEmail` varchar(320) NULL,
  `recipientEmail` varchar(320) NULL,
  `imageUrl` varchar(2000) NULL,
  `videoUrl` varchar(2000) NULL,
  `createdAt` varchar(40) NOT NULL,
  `readAt` varchar(40) NULL,
  PRIMARY KEY (`id`),
  KEY `urDirectMessages_recipient_idx` (`recipientUserId`),
  KEY `urDirectMessages_sender_idx` (`senderUserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
