
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

-- Bots table
CREATE TABLE IF NOT EXISTS bots (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  twitter_username TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL PRIMARY KEY,
  bot_id INTEGER NOT NULL,
  public_key TEXT NOT NULL UNIQUE,
  encrypted_private_key TEXT NOT NULL,
  balance TEXT NOT NULL DEFAULT '0',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Bot configs table
CREATE TABLE IF NOT EXISTS bot_configs (
  id SERIAL PRIMARY KEY,
  bot_id INTEGER NOT NULL UNIQUE,
  supported_actions JSONB NOT NULL,
  supported_tokens JSONB NOT NULL,
  transaction_fee TEXT NOT NULL DEFAULT '0.01'
);

-- Twitter webhooks table
CREATE TABLE IF NOT EXISTS twitter_webhooks (
  id SERIAL PRIMARY KEY,
  bot_id INTEGER NOT NULL UNIQUE,
  webhook_url TEXT NOT NULL,
  api_key_id TEXT,
  last_mention_id TEXT,
  next_poll_time TIMESTAMP,
  backoff_seconds INTEGER DEFAULT 30,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Token balances table
CREATE TABLE IF NOT EXISTS token_balances (
  id SERIAL PRIMARY KEY,
  wallet_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  balance TEXT NOT NULL DEFAULT '0',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(wallet_id, token)
);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  bot_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  in_token TEXT NOT NULL,
  out_token TEXT NOT NULL,
  amount TEXT NOT NULL,
  in_amount TEXT NOT NULL,
  out_amount TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_signature TEXT,
  error_message TEXT,
  tweet_id TEXT,
  tweet_text TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tweets table
CREATE TABLE IF NOT EXISTS tweets (
  id SERIAL PRIMARY KEY,
  tweet_id TEXT NOT NULL UNIQUE,
  tweet_text TEXT NOT NULL,
  author_username TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed BOOLEAN NOT NULL DEFAULT false,
  bot_id INTEGER REFERENCES bots(id),
  transaction_signature TEXT,
  processing_status TEXT DEFAULT 'pending',
  error_message TEXT
);
