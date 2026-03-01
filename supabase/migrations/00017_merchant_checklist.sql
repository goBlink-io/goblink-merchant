ALTER TABLE merchants ADD COLUMN IF NOT EXISTS onboarding_checklist JSONB DEFAULT '{
  "account_created": true,
  "wallet_connected": false,
  "settlement_configured": false,
  "first_link_created": false,
  "test_payment_completed": false,
  "webhook_configured": false
}'::jsonb;

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS first_payment_celebrated BOOLEAN DEFAULT false;
