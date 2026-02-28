import type { SupabaseClient } from "@supabase/supabase-js";

interface MerchantContext {
  business_name: string;
  settlement_token: string;
  settlement_chain: string;
  wallet_address: string;
  currency: string;
  api_key_count: number;
  webhook_count: number;
  open_tickets: number;
}

/** Fetch merchant context data for template enrichment */
async function getMerchantContext(
  merchantId: string,
  supabase: SupabaseClient
): Promise<MerchantContext> {
  // Fetch merchant profile
  const { data: merchant } = await supabase
    .from("merchants")
    .select("business_name, settlement_token, settlement_chain, wallet_address, currency")
    .eq("id", merchantId)
    .single();

  // Fetch active API key count
  const { count: apiKeyCount } = await supabase
    .from("api_keys")
    .select("*", { count: "exact", head: true })
    .eq("merchant_id", merchantId)
    .eq("is_active", true);

  // Fetch webhook endpoint count
  const { count: webhookCount } = await supabase
    .from("webhook_endpoints")
    .select("*", { count: "exact", head: true })
    .eq("merchant_id", merchantId)
    .eq("is_active", true);

  // Fetch open ticket count
  const { count: ticketCount } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("merchant_id", merchantId)
    .in("status", ["open", "in_progress", "waiting_on_merchant"]);

  return {
    business_name: merchant?.business_name ?? "your business",
    settlement_token: merchant?.settlement_token ?? "USDC",
    settlement_chain: merchant?.settlement_chain ?? "Base",
    wallet_address: merchant?.wallet_address ?? "not configured",
    currency: merchant?.currency ?? "USD",
    api_key_count: apiKeyCount ?? 0,
    webhook_count: webhookCount ?? 0,
    open_tickets: ticketCount ?? 0,
  };
}

/** Replace template placeholders in an answer with live merchant data */
export async function enrichResponse(
  answer: string,
  merchantId: string,
  supabase: SupabaseClient
): Promise<string> {
  const ctx = await getMerchantContext(merchantId, supabase);

  return answer
    .replace(/\{\{business_name\}\}/g, ctx.business_name)
    .replace(/\{\{settlement_token\}\}/g, ctx.settlement_token)
    .replace(/\{\{settlement_chain\}\}/g, ctx.settlement_chain)
    .replace(/\{\{wallet_address\}\}/g, ctx.wallet_address)
    .replace(/\{\{currency\}\}/g, ctx.currency)
    .replace(/\{\{api_key_count\}\}/g, String(ctx.api_key_count))
    .replace(/\{\{webhook_count\}\}/g, String(ctx.webhook_count))
    .replace(/\{\{open_tickets\}\}/g, String(ctx.open_tickets));
}

/** Get the merchant's business name for the greeting */
export async function getMerchantName(
  merchantId: string,
  supabase: SupabaseClient
): Promise<string> {
  const { data } = await supabase
    .from("merchants")
    .select("business_name")
    .eq("id", merchantId)
    .single();

  return data?.business_name ?? "there";
}
