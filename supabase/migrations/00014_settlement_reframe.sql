-- goBlink Merchant — Settlement onboarding reframe
-- Migrate from 4-tier (quick_start/byoe/byow/custom) to 3-tier (new_to_crypto/has_wallet/power_user)
-- Add thirdweb auth method tracking

-- Update the comment on onboarding_tier (values: new_to_crypto, has_wallet, power_user)
COMMENT ON COLUMN merchants.onboarding_tier IS 'new_to_crypto, has_wallet, power_user';

-- Track thirdweb social login method for Tier 1 (new_to_crypto)
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS thirdweb_auth_method TEXT;
COMMENT ON COLUMN merchants.thirdweb_auth_method IS 'google, apple, email — social login method used for thirdweb embedded wallet';

-- Migrate existing tier values to new names
UPDATE merchants SET onboarding_tier = 'new_to_crypto' WHERE onboarding_tier = 'quick_start';
UPDATE merchants SET onboarding_tier = 'has_wallet' WHERE onboarding_tier IN ('byoe', 'byow');
UPDATE merchants SET onboarding_tier = 'power_user' WHERE onboarding_tier = 'custom';
