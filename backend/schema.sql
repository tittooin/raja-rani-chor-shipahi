-- Cloudflare D1 Serverless SQL Database Schema
-- Raja Rani Chor Sipahi - Monetization & Leaderboards Relational Storage

-- Users profiles table definition
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  coins INTEGER DEFAULT 500,
  subscription_type TEXT DEFAULT 'FREE',
  subscription_until TEXT,
  active_pass_until TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Global leaderboard statistics tracker
CREATE TABLE IF NOT EXISTS global_leaderboard (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  total_points INTEGER DEFAULT 0,
  rounds_played INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Transaction logs for Social Gifting purchases (image_3.png auditing)
CREATE TABLE IF NOT EXISTS gifting_transactions (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  gift_id TEXT NOT NULL,
  cost INTEGER NOT NULL,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(sender_id) REFERENCES users(id),
  FOREIGN KEY(receiver_id) REFERENCES users(id)
);
