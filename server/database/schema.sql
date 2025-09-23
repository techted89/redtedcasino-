-- This schema defines the database structure for the application.
-- For an existing `users` table, you would use ALTER TABLE statements.
-- For a new setup, you can use the CREATE TABLE statement below.

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `balance` decimal(10,2) NOT NULL DEFAULT 1000.00,
  `isAdmin` tinyint(1) DEFAULT 0,
  `firstName` varchar(255) DEFAULT NULL,
  `lastName` varchar(255) DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `withdrawalTotal` decimal(10,2) DEFAULT 0.00,
  `accountId` varchar(255) DEFAULT NULL,
  `passwordChanged` tinyint(1) DEFAULT 0,
  `profileCompleted` tinyint(1) DEFAULT 0,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `accountId` (`accountId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


CREATE TABLE IF NOT EXISTS `paytables` (
  `gameId` varchar(255) NOT NULL,
  `paytable` json DEFAULT NULL,
  `symbolWeights` json DEFAULT NULL,
  PRIMARY KEY (`gameId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


CREATE TABLE IF NOT EXISTS `withdrawal_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `requestedAt` datetime DEFAULT NULL,
  `reviewedAt` datetime DEFAULT NULL,
  `reviewerId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `withdrawal_requests_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


CREATE TABLE IF NOT EXISTS `game_statistics` (
  `gameId` varchar(255) NOT NULL,
  `totalWagered` decimal(20,2) DEFAULT 0.00,
  `totalWon` decimal(20,2) DEFAULT 0.00,
  PRIMARY KEY (`gameId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
