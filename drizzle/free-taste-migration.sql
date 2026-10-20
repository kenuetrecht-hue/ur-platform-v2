CREATE TABLE IF NOT EXISTS `freeTasteCounters` (
  `id` varchar(96) NOT NULL,
  `used` int NOT NULL,
  CONSTRAINT `freeTasteCounters_id` PRIMARY KEY(`id`)
);
