CREATE TABLE IF NOT EXISTS `faceFilterPasses` (
  `id` varchar(64) NOT NULL,
  `userId` varchar(128) NOT NULL,
  `planId` varchar(16) NOT NULL,
  `expiresAt` varchar(40) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `faceFilterPasses_id` PRIMARY KEY(`id`)
);
