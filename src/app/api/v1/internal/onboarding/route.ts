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
    currency,
    timezone,
  } = body as {
    tier: string;
    wallet_address?: string;
    settlement_chain?: string;
    settlement_token?: string;
    exchange_name?: string;
    currency?: string;
    timezone?: string;
  };

  if (!tier || !["quick_start", "byoe", "byow", "custom"].includes(tier)) {
    return apiError("Invalid onboarding tier", 400);
  }

  const updateData: Record<string, unknown> = {
    onboarding_completed: true,
    onboarding_tier: tier,
  };

  if (wallet_address !== undefined) updateData.wallet_address = wallet_address;
  if (settlement_chain) updateData.settlement_chain = settlement_chain;
  if (settlement_token) updateData.settlement_token = settlement_token;
  if (exchange_name !== undefined) updateData.exchange_name = exchange_name;
  if (currency) updateData.currency = currency;
  if (timezone) updateData.timezone = timezone;

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
