-- Phase P2-B: Multi-Fiat Currency Support
-- Add display_currency to merchants, create exchange_rates table

-- 1. Add display_currency column to merchants
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS display_currency TEXT NOT NULL DEFAULT 'USD';

-- 2. Create exchange_rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate NUMERIC(18,8) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(base_currency, target_currency)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair
  ON exchange_rates(base_currency, target_currency);

-- 3. Enable RLS
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Readable by any authenticated user (rates are not sensitive)
CREATE POLICY "exchange_rates_read"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update (via cron)
-- No explicit policy needed — service role bypasses RLS

-- 4. Seed the 20 supported currencies with USD base rates (will be refreshed by cron)
INSERT INTO exchange_rates (base_currency, target_currency, rate) VALUES
  ('USD', 'USD', 1.00000000),
  ('USD', 'EUR', 0.92000000),
  ('USD', 'GBP', 0.79000000),
  ('USD', 'CAD', 1.36000000),
  ('USD', 'AUD', 1.53000000),
  ('USD', 'JPY', 149.50000000),
  ('USD', 'CHF', 0.88000000),
  ('USD', 'CNY', 7.24000000),
  ('USD', 'INR', 83.10000000),
  ('USD', 'KRW', 1320.00000000),
  ('USD', 'BRL', 4.97000000),
  ('USD', 'MXN', 17.15000000),
  ('USD', 'SGD', 1.34000000),
  ('USD', 'HKD', 7.82000000),
  ('USD', 'NOK', 10.55000000),
  ('USD', 'SEK', 10.42000000),
  ('USD', 'DKK', 6.87000000),
  ('USD', 'NZD', 1.63000000),
  ('USD', 'ZAR', 18.60000000),
  ('USD', 'TRY', 30.25000000)
ON CONFLICT (base_currency, target_currency) DO NOTHING;
