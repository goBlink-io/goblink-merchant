-- Remove the overly permissive payments UPDATE policy.
-- All payment status transitions happen via service role (API routes, cron settlers),
-- so merchants should not be able to UPDATE payments directly via RLS.
DROP POLICY IF EXISTS payments_update_own ON payments;

-- Merchants should only be able to read their own payments.
-- INSERT and UPDATE are handled by the service role (bypasses RLS).
