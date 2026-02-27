import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";

// GET /api/v1/merchant — Get merchant profile
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) {
    return apiError("Invalid or missing API key", 401);
  }

  const supabase = getServiceClient();

  const { data: merchant, error } = await supabase
    .from("merchants")
    .select("*")
    .eq("id", auth.merchantId)
    .single();

  if (error || !merchant) {
    return apiError("Merchant not found", 404);
  }

  return apiSuccess({
    id: merchant.id,
    businessName: merchant.business_name,
    country: merchant.country,
    currency: merchant.currency,
    timezone: merchant.timezone,
    walletAddress: merchant.wallet_address,
    settlementToken: merchant.settlement_token,
    settlementChain: merchant.settlement_chain,
    brandColor: merchant.brand_color,
    createdAt: merchant.created_at,
    updatedAt: merchant.updated_at,
  });
}

// PATCH /api/v1/merchant — Update merchant settings
export async function PATCH(request: NextRequest) {
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) {
    return apiError("Invalid or missing API key", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const allowedFields: Record<string, string> = {
    businessName: "business_name",
    country: "country",
    currency: "currency",
    timezone: "timezone",
    walletAddress: "wallet_address",
    settlementToken: "settlement_token",
    settlementChain: "settlement_chain",
    brandColor: "brand_color",
  };

  const updates: Record<string, unknown> = {};
  for (const [apiField, dbField] of Object.entries(allowedFields)) {
    if (apiField in body) {
      updates[dbField] = body[apiField];
    }
  }

  if (Object.keys(updates).length === 0) {
    return apiError("No valid fields to update", 400);
  }

  const supabase = getServiceClient();

  const { data: merchant, error } = await supabase
    .from("merchants")
    .update(updates)
    .eq("id", auth.merchantId)
    .select("*")
    .single();

  if (error) {
    return apiError(`Failed to update merchant: ${error.message}`, 500);
  }

  return apiSuccess({
    id: merchant.id,
    businessName: merchant.business_name,
    country: merchant.country,
    currency: merchant.currency,
    timezone: merchant.timezone,
    walletAddress: merchant.wallet_address,
    settlementToken: merchant.settlement_token,
    settlementChain: merchant.settlement_chain,
    brandColor: merchant.brand_color,
    createdAt: merchant.created_at,
    updatedAt: merchant.updated_at,
  });
}
