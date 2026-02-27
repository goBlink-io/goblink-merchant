-- goBlink Merchant — Security Hardening Migration
-- Adds audit_logs and rate_limits tables

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,           -- user ID, API key prefix, or "system"
  action TEXT NOT NULL,          -- e.g. "api_key.created", "webhook.deleted", "payment.confirmed"
  resource_type TEXT,            -- "api_key", "webhook", "payment"
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_merchant ON audit_logs(merchant_id, created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_own" ON audit_logs
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- ============================================================
-- RATE LIMITS
-- ============================================================

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rate limit check function — atomic UPSERT that returns whether the request is allowed
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
) RETURNS TABLE(allowed BOOLEAN, remaining INTEGER) AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Try to get existing record
  SELECT rl.count, rl.window_start INTO v_count, v_window_start
  FROM rate_limits rl WHERE rl.key = p_key
  FOR UPDATE;

  IF NOT FOUND THEN
    -- First request in this window
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (p_key, 1, now());
    RETURN QUERY SELECT true, p_limit - 1;
    RETURN;
  END IF;

  -- Check if window has expired
  IF v_window_start + (p_window_seconds || ' seconds')::INTERVAL < now() THEN
    -- Reset window
    UPDATE rate_limits rl SET count = 1, window_start = now() WHERE rl.key = p_key;
    RETURN QUERY SELECT true, p_limit - 1;
    RETURN;
  END IF;

  -- Window is still active
  IF v_count >= p_limit THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  -- Increment counter
  UPDATE rate_limits rl SET count = v_count + 1 WHERE rl.key = p_key;
  RETURN QUERY SELECT true, p_limit - (v_count + 1);
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Periodic cleanup of stale rate limit entries (optional — called by cron or manually)
CREATE OR REPLACE FUNCTION cleanup_rate_limits(p_max_age_seconds INTEGER DEFAULT 300)
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limits
  WHERE window_start + (p_max_age_seconds || ' seconds')::INTERVAL < now();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;
