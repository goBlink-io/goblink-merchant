-- Phase F — Audit Logs Enhancement
-- Adds admin_id column for admin-initiated actions

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS admin_id UUID;

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id) WHERE admin_id IS NOT NULL;
