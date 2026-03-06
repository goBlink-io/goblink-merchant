-- goBlink Merchant — Onboarding columns
-- Tracks wizard completion state and selected tier

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS onboarding_tier TEXT; -- quick_start, byoe, byow, custom
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS exchange_name TEXT; -- for BYOE tier
