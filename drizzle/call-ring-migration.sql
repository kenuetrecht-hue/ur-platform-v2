CREATE TABLE IF NOT EXISTS `callRingSubscriptions` (
  `id` char(64) NOT NULL,
  `userId` varchar(128) NOT NULL,
  `endpoint` varchar(768) NOT NULL,
  `p256dh` varchar(200) NOT NULL,
  `auth` varchar(200) NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `callRingSubscriptions_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `callRingKeys` (
  `id` varchar(16) NOT NULL,
  `publicKey` varchar(200) NOT NULL,
  `privateKey` varchar(200) NOT NULL,
  CONSTRAINT `callRingKeys_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `callNotices` (
  `id` varchar(64) NOT NULL,
  `callerUserId` varchar(128) NOT NULL,
  `calleeUserId` varchar(128) NOT NULL,
  `callerName` varchar(40) NOT NULL,
  `roomId` varchar(64) NOT NULL,
  `createdAt` varchar(40) NOT NULL,
  CONSTRAINT `callNotices_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `callAppTokens` (
  `id` char(64) NOT NULL,
  `userId` varchar(128) NOT NULL,
  `token` varchar(200) NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `callAppTokens_id` PRIMARY KEY(`id`)
);
