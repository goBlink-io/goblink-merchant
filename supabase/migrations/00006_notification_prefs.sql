-- Add notification preferences to merchants table
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{"payment_received": true, "payment_failed": true, "ticket_reply": true, "withdrawal_complete": true, "weekly_summary": false}';
