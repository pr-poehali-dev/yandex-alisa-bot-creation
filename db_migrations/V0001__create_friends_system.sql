
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  bio TEXT DEFAULT '',
  avatar TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE friend_requests (
  id SERIAL PRIMARY KEY,
  from_username VARCHAR(20) NOT NULL,
  to_username VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_username, to_username)
);

CREATE TABLE friendships (
  id SERIAL PRIMARY KEY,
  username_a VARCHAR(20) NOT NULL,
  username_b VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(username_a, username_b)
);

CREATE TABLE friend_messages (
  id SERIAL PRIMARY KEY,
  from_username VARCHAR(20) NOT NULL,
  to_username VARCHAR(20) NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_friend_requests_to ON friend_requests(to_username);
CREATE INDEX idx_friend_messages_pair ON friend_messages(from_username, to_username);
CREATE INDEX idx_friendships_a ON friendships(username_a);
CREATE INDEX idx_friendships_b ON friendships(username_b);
