-- ============================================================
-- Bulk Mailer — Migration 002: Mail Logs Table
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- ============================================================
-- MAIL_LOGS TABLE
-- Records every email campaign sent through the Mailing module.
-- ============================================================
CREATE TABLE IF NOT EXISTS mail_logs (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  subject       TEXT         NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 998),
  sender_email  TEXT         NOT NULL CHECK (char_length(sender_email) BETWEEN 3 AND 254),
  total_sent    INTEGER      NOT NULL DEFAULT 0 CHECK (total_sent >= 0),
  total_failed  INTEGER      NOT NULL DEFAULT 0 CHECK (total_failed >= 0),
  -- JSONB array of per-recipient results: [{ email, status, messageId?, error? }]
  recipients    JSONB        NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mail_logs_created_at_idx   ON mail_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS mail_logs_sender_email_idx ON mail_logs (sender_email);

-- Disable RLS (service_role key bypasses anyway)
ALTER TABLE mail_logs DISABLE ROW LEVEL SECURITY;
