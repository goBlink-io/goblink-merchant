-- Admin tables for platform admin dashboard
-- This migration adds:
-- 1. admins table (no RLS - only queried via service role)
-- 2. suspended_at column on merchants table

-- ============================================================
-- 1. Admins table
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS on admins table — only accessed via service role client
-- To insert the first admin after deployment:
-- INSERT INTO admins (user_id) VALUES ('your-user-id-here');

CREATE INDEX idx_admins_user_id ON admins (user_id);

-- ============================================================
-- 2. Add suspended_at to merchants
-- ============================================================
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
