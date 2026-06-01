-- ============================================================
-- Bulk Mailer POC — Initial Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- Enable UUID generation (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE sender_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE recipient_status AS ENUM ('active', 'unsubscribed', 'bounced');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE upload_type_enum AS ENUM ('senders', 'recipients');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- auto-update updated_at helper function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SENDERS TABLE
-- Emails are stored lowercase — UNIQUE index handles dedup
-- ============================================================
CREATE TABLE IF NOT EXISTS senders (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT          NOT NULL    CHECK (char_length(name) BETWEEN 1 AND 100),
  email       TEXT          NOT NULL    UNIQUE CHECK (char_length(email) BETWEEN 3 AND 254),
  reply_to    TEXT                      CHECK (reply_to IS NULL OR char_length(reply_to) BETWEEN 3 AND 254),
  status      sender_status NOT NULL    DEFAULT 'active',
  created_at  TIMESTAMPTZ  NOT NULL    DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS senders_status_idx      ON senders (status);
CREATE INDEX IF NOT EXISTS senders_created_at_idx  ON senders (created_at DESC);

DROP TRIGGER IF EXISTS senders_updated_at ON senders;
CREATE TRIGGER senders_updated_at
  BEFORE UPDATE ON senders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RECIPIENTS TABLE
-- tags stored as text array, extra CSV columns in metadata jsonb
-- ============================================================
CREATE TABLE IF NOT EXISTS recipients (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT                         CHECK (name IS NULL OR char_length(name) BETWEEN 1 AND 100),
  email       TEXT             NOT NULL    UNIQUE CHECK (char_length(email) BETWEEN 3 AND 254),
  tags        TEXT[]           NOT NULL    DEFAULT '{}',
  metadata    JSONB            NOT NULL    DEFAULT '{}',
  status      recipient_status NOT NULL    DEFAULT 'active',
  created_at  TIMESTAMPTZ      NOT NULL    DEFAULT NOW(),
  updated_at  TIMESTAMPTZ      NOT NULL    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recipients_status_idx     ON recipients (status);
CREATE INDEX IF NOT EXISTS recipients_tags_gin_idx   ON recipients USING GIN (tags);
CREATE INDEX IF NOT EXISTS recipients_created_at_idx ON recipients (created_at DESC);

DROP TRIGGER IF EXISTS recipients_updated_at ON recipients;
CREATE TRIGGER recipients_updated_at
  BEFORE UPDATE ON recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- UPLOAD_LOGS TABLE
-- Full audit trail for every file upload
-- ============================================================
CREATE TABLE IF NOT EXISTS upload_logs (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_type upload_type_enum NOT NULL,
  filename    TEXT             NOT NULL CHECK (char_length(filename) <= 255),
  total_rows  INTEGER          NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  inserted    INTEGER          NOT NULL DEFAULT 0 CHECK (inserted >= 0),
  updated     INTEGER          NOT NULL DEFAULT 0 CHECK (updated >= 0),
  skipped     INTEGER          NOT NULL DEFAULT 0 CHECK (skipped >= 0),
  error_count INTEGER          NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  errors      JSONB            NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS upload_logs_type_idx       ON upload_logs (upload_type);
CREATE INDEX IF NOT EXISTS upload_logs_created_at_idx ON upload_logs (created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY — disable for service_role key usage
-- (backend uses service_role key, so RLS is bypassed anyway)
-- ============================================================
ALTER TABLE senders      DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipients   DISABLE ROW LEVEL SECURITY;
ALTER TABLE upload_logs  DISABLE ROW LEVEL SECURITY;
