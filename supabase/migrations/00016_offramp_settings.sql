-- goBlink Merchant — Offramp settings
-- Add offramp provider preferences to merchants table

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS offramp_provider TEXT DEFAULT NULL;
COMMENT ON COLUMN merchants.offramp_provider IS 'coinbase, shakepay, onramper';

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS offramp_currency TEXT DEFAULT 'USD';
COMMENT ON COLUMN merchants.offramp_currency IS 'Preferred fiat currency for offramp (USD, CAD, EUR, etc.)';

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS shakepay_deposit_address TEXT DEFAULT NULL;
COMMENT ON COLUMN merchants.shakepay_deposit_address IS 'Shakepay USDC ERC-20 deposit address for quick offramp';

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS auto_offramp_enabled BOOLEAN DEFAULT false;
COMMENT ON COLUMN merchants.auto_offramp_enabled IS 'Auto-convert to fiat after payment (future feature)';
