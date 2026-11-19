-- FaceTag schema for Neon / any PostgreSQL database.
-- Safe to re-run. Embeddings are JSON arrays so the built-in signature
-- and an optional remote model can share one column.
--
-- Better Auth core tables (user / session / account / verification) are
-- separate from the FaceTag "users" profile table. Run this whole file
-- after setting DATABASE_URL, or use `npx auth migrate` for auth tables.

CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS session_user_id_idx ON session (user_id);
CREATE INDEX IF NOT EXISTS account_user_id_idx ON account (user_id);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  username VARCHAR(255) UNIQUE,
  bio TEXT,
  is_public BOOLEAN DEFAULT true,
  primary_link_platform VARCHAR(50),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS face_embeddings (
  user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  embedding JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS social_links (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS scan_events (
  id SERIAL PRIMARY KEY,
  scanner_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  scanned_user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  matched BOOLEAN DEFAULT false,
  event_type VARCHAR(20) DEFAULT 'scan',
  platform VARCHAR(50),
  scanned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE scan_events ADD COLUMN IF NOT EXISTS event_type VARCHAR(20) DEFAULT 'scan';
ALTER TABLE scan_events ADD COLUMN IF NOT EXISTS platform VARCHAR(50);

CREATE INDEX IF NOT EXISTS scan_events_scanned_idx ON scan_events (scanned_user_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS social_links_user_idx ON social_links (user_id, display_order);

-- If an older database stored embeddings as pgvector, convert once:
-- ALTER TABLE face_embeddings
--   ALTER COLUMN embedding TYPE JSONB
--   USING embedding::text::jsonb;
