-- AI chat cross-device sync (run against MySQL ur_platform)
CREATE TABLE IF NOT EXISTS aiChatThreads (
  id VARCHAR(36) PRIMARY KEY,
  userId INT NOT NULL,
  creatorId VARCHAR(64) NOT NULL,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY aiChatThreads_user_creator (userId, creatorId),
  KEY aiChatThreads_userId (userId)
);

CREATE TABLE IF NOT EXISTS aiChatMessages (
  id VARCHAR(36) PRIMARY KEY,
  threadId VARCHAR(36) NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY aiChatMessages_thread_created (threadId, createdAt)
);
