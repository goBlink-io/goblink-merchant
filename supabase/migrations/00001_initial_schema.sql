-- goBlink Merchant — Initial Schema
-- All tables from PLAN.md Section 13 with RLS policies and indexes

-- ============================================================
-- TABLES
-- ============================================================

-- Merchants
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  logo_url TEXT,
  brand_color TEXT DEFAULT '#2563EB',
  wallet_address TEXT,
  settlement_token TEXT NOT NULL DEFAULT 'USDC',
  settlement_chain TEXT NOT NULL DEFAULT 'base',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- API Keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  label TEXT DEFAULT 'Default',
  is_test BOOLEAN NOT NULL DEFAULT false,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE NOT NULL,
  external_order_id TEXT,
  amount NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  crypto_amount TEXT,
  crypto_token TEXT,
  crypto_chain TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_url TEXT,
  deposit_address TEXT,
  customer_wallet TEXT,
  customer_chain TEXT,
  customer_token TEXT,
  send_tx_hash TEXT,
  fulfillment_tx_hash TEXT,
  fee_amount NUMERIC(18,6),
  fee_currency TEXT,
  net_amount NUMERIC(18,2),
  return_url TEXT,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Refunds
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE NOT NULL,
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL,
  crypto_amount TEXT,
  crypto_token TEXT,
  crypto_chain TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  tx_hash TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL,
  recipient_name TEXT,
  recipient_email TEXT,
  line_items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(18,2) NOT NULL,
  tax_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  total NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft',
  due_date DATE,
  memo TEXT,
  payment_terms TEXT,
  payment_id UUID REFERENCES payments(id),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Offramp Configurations
CREATE TABLE offramp_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  deposit_address TEXT NOT NULL,
  deposit_chain TEXT NOT NULL,
  deposit_token TEXT NOT NULL,
  label TEXT,
  is_default BOOLEAN DEFAULT false,
  auto_settle BOOLEAN DEFAULT false,
  auto_settle_threshold NUMERIC(18,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Withdrawals
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE NOT NULL,
  offramp_config_id UUID REFERENCES offramp_configs(id),
  amount NUMERIC(18,2) NOT NULL,
  crypto_amount TEXT NOT NULL,
  source_token TEXT NOT NULL DEFAULT 'USDC',
  source_chain TEXT NOT NULL DEFAULT 'base',
  destination_address TEXT NOT NULL,
  destination_token TEXT NOT NULL,
  destination_chain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Webhook Endpoints
CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY['payment.confirmed'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Webhook Deliveries
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_endpoint_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE NOT NULL,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_merchants_user_id ON merchants(user_id);
CREATE INDEX idx_payments_merchant_status ON payments(merchant_id, status);
CREATE INDEX idx_payments_merchant_created ON payments(merchant_id, created_at DESC);
CREATE INDEX idx_payments_external_order ON payments(merchant_id, external_order_id);
CREATE INDEX idx_payments_deposit_address ON payments(deposit_address);
CREATE INDEX idx_refunds_payment ON refunds(payment_id);
CREATE INDEX idx_refunds_merchant ON refunds(merchant_id);
CREATE INDEX idx_invoices_merchant_status ON invoices(merchant_id, status);
CREATE INDEX idx_withdrawals_merchant ON withdrawals(merchant_id, created_at DESC);
CREATE INDEX idx_api_keys_merchant ON api_keys(merchant_id);
CREATE INDEX idx_webhook_endpoints_merchant ON webhook_endpoints(merchant_id);
CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries(webhook_endpoint_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE offramp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Merchants: users can only access their own merchant record
CREATE POLICY "merchants_select_own" ON merchants
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "merchants_insert_own" ON merchants
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "merchants_update_own" ON merchants
  FOR UPDATE USING (auth.uid() = user_id);

-- API Keys: merchants can manage their own keys
CREATE POLICY "api_keys_select_own" ON api_keys
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );
CREATE POLICY "api_keys_insert_own" ON api_keys
  FOR INSERT WITH CHECK (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );
CREATE POLICY "api_keys_delete_own" ON api_keys
  FOR DELETE USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Payments: merchant-scoped
CREATE POLICY "payments_select_own" ON payments
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );
CREATE POLICY "payments_insert_own" ON payments
  FOR INSERT WITH CHECK (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );
CREATE POLICY "payments_update_own" ON payments
  FOR UPDATE USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Refunds: merchant-scoped
CREATE POLICY "refunds_select_own" ON refunds
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );
CREATE POLICY "refunds_insert_own" ON refunds
  FOR INSERT WITH CHECK (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Invoices: merchant-scoped
CREATE POLICY "invoices_select_own" ON invoices
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );
CREATE POLICY "invoices_insert_own" ON invoices
  FOR INSERT WITH CHECK (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );
CREATE POLICY "invoices_update_own" ON invoices
  FOR UPDATE USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Offramp Configs: merchant-scoped
CREATE POLICY "offramp_configs_select_own" ON offramp_configs
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );
CREATE POLICY "offramp_configs_insert_own" ON offramp_configs
  FOR INSERT WITH CHECK (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );
CREATE POLICY "offramp_configs_update_own" ON offramp_configs
  FOR UPDATE USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );
CREATE POLICY "offramp_configs_delete_own" ON offramp_configs
  FOR DELETE USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Withdrawals: merchant-scoped
CREATE POLICY "withdrawals_select_own" ON withdrawals
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );
CREATE POLICY "withdrawals_insert_own" ON withdrawals
  FOR INSERT WITH CHECK (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Webhook Endpoints: merchant-scoped
CREATE POLICY "webhook_endpoints_select_own" ON webhook_endpoints
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );
CREATE POLICY "webhook_endpoints_insert_own" ON webhook_endpoints
  FOR INSERT WITH CHECK (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );
CREATE POLICY "webhook_endpoints_update_own" ON webhook_endpoints
  FOR UPDATE USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );
CREATE POLICY "webhook_endpoints_delete_own" ON webhook_endpoints
  FOR DELETE USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Webhook Deliveries: viewable if merchant owns the endpoint
CREATE POLICY "webhook_deliveries_select_own" ON webhook_deliveries
  FOR SELECT USING (
    webhook_endpoint_id IN (
      SELECT we.id FROM webhook_endpoints we
      WHERE we.merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
    )
  );

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_merchants_updated_at
  BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create merchant record on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.merchants (user_id, business_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business'));
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
