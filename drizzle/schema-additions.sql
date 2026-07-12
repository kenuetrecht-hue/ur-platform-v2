-- Stamp Management Tables
-- ============================================================================

-- User Stamps Balance
CREATE TABLE IF NOT EXISTS userStamps (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL UNIQUE,
  totalStamps INT DEFAULT 0,
  availableStamps INT DEFAULT 0,
  stampsUsed INT DEFAULT 0,
  lastPurchaseDate TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  INDEX idx_userId (userId)
);

-- Stamp Transaction History
CREATE TABLE IF NOT EXISTS stampTransactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  transactionType ENUM('purchase', 'redemption', 'expiration', 'bonus') NOT NULL,
  stampsAmount INT NOT NULL,
  reason VARCHAR(255),
  relatedId VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  INDEX idx_userId (userId),
  INDEX idx_createdAt (createdAt)
);

-- AI Service Access Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS aiServiceAccess (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  aiCreatorId VARCHAR(255) NOT NULL,
  aiCreatorName VARCHAR(255),
  accessStartDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accessEndDate TIMESTAMP NOT NULL,
  costInStamps INT,
  costInLoyaltyPoints INT,
  redemptionType ENUM('stamps', 'loyalty_points') NOT NULL,
  status ENUM('active', 'expired') DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  INDEX idx_userId (userId),
  INDEX idx_status (status),
  INDEX idx_accessEndDate (accessEndDate)
);

-- Creator Tier Tracking (for 30-day promotion)
-- ============================================================================

CREATE TABLE IF NOT EXISTS creatorPromotionTier (
  id INT PRIMARY KEY AUTO_INCREMENT,
  creatorId VARCHAR(255) NOT NULL UNIQUE,
  creatorName VARCHAR(255),
  joinDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tier ENUM('1', '2', '3') NOT NULL,
  earningsPercentage DECIMAL(5, 2),
  promotionEndDate TIMESTAMP,
  freeTicketsPerWeek INT DEFAULT 0,
  monthlyDrawingEligible BOOLEAN DEFAULT FALSE,
  status ENUM('active', 'inactive') DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tier (tier),
  INDEX idx_joinDate (joinDate)
);

-- Promotion Statistics (for real-time tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS promotionStats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tier ENUM('1', '2', '3') NOT NULL UNIQUE,
  creatorsJoined INT DEFAULT 0,
  capacity INT DEFAULT 100,
  lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tier (tier)
);

-- Initialize promotion stats
INSERT INTO promotionStats (tier, creatorsJoined, capacity) VALUES
  ('1', 0, 100),
  ('2', 0, 100),
  ('3', 0, 100)
ON DUPLICATE KEY UPDATE creatorsJoined = creatorsJoined;
