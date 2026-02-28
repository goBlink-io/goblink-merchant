export interface AdminMerchant {
  id: string;
  user_id: string;
  business_name: string;
  country: string;
  currency: string;
  timezone: string;
  logo_url: string | null;
  brand_color: string | null;
  wallet_address: string | null;
  settlement_token: string | null;
  settlement_chain: string | null;
  suspended_at: string | null;
  created_at: string;
  updated_at: string;
  email?: string;
  total_volume?: number;
  total_payments?: number;
}

export interface AdminPayment {
  id: string;
  merchant_id: string;
  external_order_id: string | null;
  amount: number;
  currency: string;
  crypto_amount: number | null;
  crypto_token: string | null;
  crypto_chain: string | null;
  status: string;
  payment_url: string | null;
  deposit_address: string | null;
  customer_wallet: string | null;
  customer_chain: string | null;
  customer_token: string | null;
  send_tx_hash: string | null;
  fulfillment_tx_hash: string | null;
  fee_amount: number | null;
  fee_currency: string | null;
  net_amount: number | null;
  return_url: string | null;
  metadata: Record<string, unknown> | null;
  expires_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  merchant_name?: string;
}

export interface AdminStats {
  totalMerchants: number;
  totalPayments: number;
  totalVolume: number;
  feeRevenue: number;
  activeMerchants: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  volume: number;
  count: number;
}

export interface RevenueByMerchant {
  merchant_id: string;
  business_name: string;
  total_fees: number;
  total_volume: number;
  payment_count: number;
}

export interface RevenueByChain {
  chain: string;
  total_fees: number;
  count: number;
}

export interface WebhookDeliveryRecord {
  id: string;
  webhook_endpoint_id: string;
  event: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  attempt: number;
  delivered_at: string | null;
  created_at: string;
  endpoint_url?: string;
  merchant_name?: string;
}

export interface MerchantDetail extends AdminMerchant {
  payments: AdminPayment[];
  api_key_count: number;
  webhook_endpoints: { id: string; url: string; events: string[]; is_active: boolean; created_at: string }[];
}

export interface IssuesMerchant {
  merchant_id: string;
  business_name: string;
  total_payments: number;
  failed_payments: number;
  failure_rate: number;
}
