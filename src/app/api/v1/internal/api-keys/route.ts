import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/api-auth";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";

// POST — Create API key (authenticated via session)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { merchantId, label, isTest } = body as {
    merchantId: string;
    label?: string;
    isTest?: boolean;
  };

  // Verify merchant belongs to this user
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("id", merchantId)
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return apiError("Merchant not found", 404);
  }

  const { apiKey, keyId } = await generateApiKey(
    merchantId,
    isTest ?? false,
    label || "Default"
  );

  return apiSuccess({ apiKey, keyId }, 201);
}

// DELETE — Delete API key (authenticated via session)
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { keyId, merchantId } = body as { keyId: string; merchantId: string };

  // Verify merchant belongs to this user
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("id", merchantId)
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return apiError("Merchant not found", 404);
  }

  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from("api_keys")
    .delete()
    .eq("id", keyId)
    .eq("merchant_id", merchantId);

  if (error) {
    return apiError("Failed to delete API key", 500);
  }

  return apiSuccess({ deleted: true });
}
