-- 00022_settlement.sql
-- Add settlement tracking columns to payments table for 1Click integration.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS intent_id TEXT,
  ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS settlement_chain TEXT,
  ADD COLUMN IF NOT EXISTS settlement_token TEXT,
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;

-- Index for cron polling: find payments with active settlements
CREATE INDEX IF NOT EXISTS idx_payments_settlement_status
  ON payments (settlement_status)
  WHERE settlement_status IN ('pending', 'processing');

-- Index for lookup by intent_id
CREATE INDEX IF NOT EXISTS idx_payments_intent_id
  ON payments (intent_id)
  WHERE intent_id IS NOT NULL;

COMMENT ON COLUMN payments.intent_id IS '1Click intent ID returned when deposit address is generated';
COMMENT ON COLUMN payments.settlement_status IS 'Settlement lifecycle: none → pending → processing → settled → failed';
COMMENT ON COLUMN payments.settlement_chain IS 'Destination chain for settlement (e.g. base, ethereum)';
COMMENT ON COLUMN payments.settlement_token IS 'Destination token for settlement (e.g. USDC, USDT)';
COMMENT ON COLUMN payments.settled_at IS 'Timestamp when 1Click settlement was confirmed';
