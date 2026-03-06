-- 00019: Checkout customization — powered badge toggle
-- HXF 3.2: Allow merchants to show/hide the "Powered by goBlink" badge on checkout.
-- Enabling the badge reduces processing fee by 0.05%.

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS show_powered_badge BOOLEAN DEFAULT true;
