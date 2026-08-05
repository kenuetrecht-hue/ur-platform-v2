-- TechBuilder sandbox tables (run when DATABASE_URL is configured)

CREATE TABLE IF NOT EXISTS coderSandboxAccounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL UNIQUE,
  tierId ENUM('starter', 'builder', 'studio', 'enterprise') DEFAULT 'starter' NOT NULL,
  usedBytes INT DEFAULT 0 NOT NULL,
  learningJson TEXT,
  upgradedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id),
  INDEX idx_userId (userId)
);

CREATE TABLE IF NOT EXISTS coderSandboxProjects (
  id VARCHAR(64) PRIMARY KEY,
  userId INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  framework VARCHAR(64) DEFAULT 'React Native / Expo' NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id),
  INDEX idx_userId (userId)
);

CREATE TABLE IF NOT EXISTS coderSandboxFiles (
  id VARCHAR(64) PRIMARY KEY,
  projectId VARCHAR(64) NOT NULL,
  userId INT NOT NULL,
  path VARCHAR(512) NOT NULL,
  content TEXT NOT NULL,
  language VARCHAR(32) NOT NULL,
  sizeBytes INT NOT NULL,
  storageKey VARCHAR(512),
  storageUrl VARCHAR(512),
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id),
  INDEX idx_projectId (projectId),
  INDEX idx_userId (userId),
  UNIQUE KEY uniq_project_path (projectId, path)
);

CREATE TABLE IF NOT EXISTS coderSandboxPayments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  tierId ENUM('builder', 'studio', 'enterprise') NOT NULL,
  paymentIntentId VARCHAR(128) NOT NULL,
  amountCents INT NOT NULL,
  status ENUM('pending', 'succeeded', 'failed') DEFAULT 'pending' NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id),
  INDEX idx_userId (userId),
  INDEX idx_paymentIntentId (paymentIntentId)
);
