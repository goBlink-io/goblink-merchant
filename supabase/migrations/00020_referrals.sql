-- Migration 00020: Referral program
-- HXF Sprint 3 — Referrals

-- ============================================================
-- Add referral code to merchants
-- ============================================================
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- ============================================================
-- merchant_referrals table
-- ============================================================
CREATE TABLE IF NOT EXISTS merchant_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rewarded')),
  reward_applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  UNIQUE(referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON merchant_referrals(referrer_id);

-- RLS
ALTER TABLE merchant_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY referrals_select_own ON merchant_referrals
  FOR SELECT USING (
    referrer_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
    OR referred_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- Expand notification type CHECK to include referral
-- ============================================================
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'payment_received', 'payment_failed', 'ticket_reply',
    'webhook_failed', 'system', 'first_payment', 'milestone', 'referral'
  ));
