import { NextRequest } from "next/server";
import { validateApiKey, isApiForbidden } from "@/lib/api-auth";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";

// GET /api/v1/merchant — Get merchant profile
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request.headers.get("authorization"), request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for"));
  if (isApiForbidden(auth)) {
    return apiError("IP address not allowed for this API key", 403);
  }
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
  const auth = await validateApiKey(request.headers.get("authorization"), request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for"));
  if (isApiForbidden(auth)) {
    return apiError("IP address not allowed for this API key", 403);
  }
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
    customCheckoutFields: "custom_checkout_fields",
  };

  // Validate custom_checkout_fields if present
  if ("customCheckoutFields" in body) {
    const fields = body.customCheckoutFields;
    if (!Array.isArray(fields)) {
      return apiError("customCheckoutFields must be an array", 400);
    }
    if (fields.length > 5) {
      return apiError("Maximum 5 custom checkout fields allowed", 400);
    }
    const validTypes = ["text", "email", "textarea", "select"];
    for (const field of fields) {
      if (!field || typeof field !== "object") {
        return apiError("Each field must be an object", 400);
      }
      if (!field.label || typeof field.label !== "string" || field.label.trim().length === 0) {
        return apiError("Each field must have a non-empty label", 400);
      }
      if (!validTypes.includes(field.type)) {
        return apiError(`Field type must be one of: ${validTypes.join(", ")}`, 400);
      }
      if (field.type === "select" && (!Array.isArray(field.options) || field.options.length === 0)) {
        return apiError("Select fields must have a non-empty options array", 400);
      }
    }
  }

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

  logAudit({
    merchantId: auth.merchantId,
    actor: auth.keyId,
    action: "settings.updated",
    resourceType: "merchant",
    resourceId: auth.merchantId,
    metadata: { fields: Object.keys(updates) },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

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
