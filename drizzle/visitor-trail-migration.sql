CREATE TABLE IF NOT EXISTS visitorTrailEvents (
  id VARCHAR(36) PRIMARY KEY,
  visitorId VARCHAR(36) NOT NULL,
  kind ENUM('page', 'button', 'dwell') NOT NULL,
  path VARCHAR(180) NOT NULL,
  label VARCHAR(80) NOT NULL,
  signedIn TINYINT NOT NULL DEFAULT 0,
  seconds INT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY visitorTrail_created (createdAt),
  KEY visitorTrail_visitor (visitorId, createdAt)
);
