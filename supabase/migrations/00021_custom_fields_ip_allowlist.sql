-- HXF 3.4: Custom checkout fields per merchant
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS custom_checkout_fields JSONB DEFAULT '[]'::jsonb;

-- HXF 3.6: IP allowlisting for API keys
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS allowed_ips TEXT[] DEFAULT '{}';
