import { NextRequest } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";

// POST — Create webhook endpoint (authenticated via session)
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

  const { merchantId, url, events } = body as {
    merchantId: string;
    url: string;
    events: string[];
  };

  if (!url || !events || events.length === 0) {
    return apiError("url and events are required", 400);
  }

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

  const secret = `whsec_${crypto.randomBytes(32).toString("hex")}`;

  const serviceClient = getServiceClient();
  const { data: webhook, error } = await serviceClient
    .from("webhook_endpoints")
    .insert({
      merchant_id: merchantId,
      url,
      secret,
      events,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) {
    return apiError(`Failed to create webhook: ${error.message}`, 500);
  }

  return apiSuccess(
    {
      id: webhook.id,
      url: webhook.url,
      secret: webhook.secret,
      events: webhook.events,
      isActive: webhook.is_active,
      createdAt: webhook.created_at,
    },
    201
  );
}

// DELETE — Delete webhook endpoint (authenticated via session)
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

  const { webhookId, merchantId } = body as { webhookId: string; merchantId: string };

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
    .from("webhook_endpoints")
    .delete()
    .eq("id", webhookId)
    .eq("merchant_id", merchantId);

  if (error) {
    return apiError("Failed to delete webhook", 500);
  }

  return apiSuccess({ deleted: true });
}
