-- Migration 00011: Notifications table for in-app notification center
-- Phase E — Polish & Trust

-- ============================================================
-- notifications table
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('payment_received', 'payment_failed', 'ticket_reply', 'webhook_failed', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own ON notifications
  FOR SELECT USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_notifications_merchant_unread
  ON notifications (merchant_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX idx_notifications_merchant_recent
  ON notifications (merchant_id, created_at DESC);
