import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const {
    tier,
    wallet_address,
    settlement_chain,
    settlement_token,
    exchange_name,
    thirdweb_auth_method,
    currency,
    timezone,
    offramp_provider,
    offramp_currency,
    shakepay_deposit_address,
  } = body as {
    tier?: string;
    wallet_address?: string;
    settlement_chain?: string;
    settlement_token?: string;
    exchange_name?: string;
    thirdweb_auth_method?: string;
    currency?: string;
    timezone?: string;
    offramp_provider?: string | null;
    offramp_currency?: string;
    shakepay_deposit_address?: string | null;
  };

  const validTiers = [
    "new_to_crypto", "has_wallet", "power_user",
    // Legacy tiers (accept for backwards compat during migration)
    "quick_start", "byoe", "byow", "custom",
  ];

  // tier is required for onboarding but optional for settings updates
  if (tier && !validTiers.includes(tier)) {
    return apiError("Invalid onboarding tier", 400);
  }

  const updateData: Record<string, unknown> = {};

  if (tier) {
    updateData.onboarding_completed = true;
    updateData.onboarding_tier = tier;
  }

  if (wallet_address !== undefined) updateData.wallet_address = wallet_address;
  if (settlement_chain) updateData.settlement_chain = settlement_chain;
  if (settlement_token) updateData.settlement_token = settlement_token;
  if (exchange_name !== undefined) updateData.exchange_name = exchange_name;
  if (thirdweb_auth_method) updateData.thirdweb_auth_method = thirdweb_auth_method;
  if (currency) updateData.currency = currency;
  if (timezone) updateData.timezone = timezone;
  if (offramp_provider !== undefined) updateData.offramp_provider = offramp_provider;
  if (offramp_currency !== undefined) updateData.offramp_currency = offramp_currency;
  if (shakepay_deposit_address !== undefined) updateData.shakepay_deposit_address = shakepay_deposit_address;

  const { data: merchant, error } = await supabase
    .from("merchants")
    .update(updateData)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return apiError(error.message, 500);
  }

  return apiSuccess(merchant);
}
