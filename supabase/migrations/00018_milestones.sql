-- Migration 00018: Merchant milestones + expand notification types
-- HXF Sprint 2 — Celebrations & Milestones

-- ============================================================
-- Expand notification type CHECK to include first_payment, milestone
-- ============================================================
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'payment_received', 'payment_failed', 'ticket_reply',
    'webhook_failed', 'system', 'first_payment', 'milestone'
  ));

-- ============================================================
-- merchant_milestones table
-- ============================================================
CREATE TABLE IF NOT EXISTS merchant_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified BOOLEAN DEFAULT false,
  UNIQUE(merchant_id, milestone_key)
);

CREATE INDEX IF NOT EXISTS idx_merchant_milestones_merchant
  ON merchant_milestones(merchant_id);

-- RLS
ALTER TABLE merchant_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY merchant_milestones_select_own ON merchant_milestones
  FOR SELECT USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );
