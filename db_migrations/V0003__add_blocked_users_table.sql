CREATE TABLE IF NOT EXISTS blocked_users (
  blocker VARCHAR(50) NOT NULL,
  blocked VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (blocker, blocked)
);