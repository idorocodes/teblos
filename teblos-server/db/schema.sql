 

CREATE TABLE IF NOT EXISTS users (
  wallet_address TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS credits (
  wallet_address TEXT PRIMARY KEY REFERENCES users(wallet_address),
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  tx_signature TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
  amount_lamports INTEGER NOT NULL,
  credits_granted INTEGER NOT NULL,
  verified_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS credit_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
  endpoint TEXT NOT NULL,
  used_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Helpful indexes for the hot-path lookups
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_credit_usage_wallet ON credit_usage(wallet_address);