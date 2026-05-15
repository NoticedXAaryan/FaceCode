-- FaceTag PostgreSQL Schema Documentation
-- This file serves as a reference for the tables used in the Neon Serverless Database.

CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY, -- Clerk User ID
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  username VARCHAR(255) UNIQUE,
  bio TEXT,
  is_public BOOLEAN DEFAULT false,
  primary_link_platform VARCHAR(50),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE face_embeddings (
  user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  embedding VECTOR(384), -- Assuming a 384-dimensional face embedding using pgvector
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE social_links (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE scan_events (
  id SERIAL PRIMARY KEY,
  scanner_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  scanned_user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  matched BOOLEAN DEFAULT false,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
