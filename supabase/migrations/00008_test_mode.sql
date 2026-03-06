-- Test mode support: flag payments created with test API keys
ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_payments_is_test ON payments(is_test);
