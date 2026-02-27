import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { deliverWebhook } from "@/lib/webhooks";
import { apiError, apiSuccess } from "@/lib/api-response";

// POST /api/v1/internal/webhooks/deliveries/:id/retry — Manual retry (session auth)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;
  const serviceClient = getServiceClient();

  // Fetch the delivery
  const { data: delivery } = await serviceClient
    .from("webhook_deliveries")
    .select("id, webhook_endpoint_id, event, payload, attempt")
    .eq("id", id)
    .single();

  if (!delivery) {
    return apiError("Delivery not found", 404);
  }

  // Fetch the endpoint and verify ownership
  const { data: endpoint } = await serviceClient
    .from("webhook_endpoints")
    .select("id, url, secret, merchant_id")
    .eq("id", delivery.webhook_endpoint_id)
    .single();

  if (!endpoint) {
    return apiError("Webhook endpoint not found", 404);
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("id", endpoint.merchant_id)
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return apiError("Not authorized", 403);
  }

  // Re-deliver with attempt incremented
  const result = await deliverWebhook(
    endpoint.id,
    endpoint.url,
    endpoint.secret,
    delivery.payload,
    delivery.attempt + 1
  );

  return apiSuccess({
    delivered: result.success,
    responseStatus: result.status,
    responseBody: result.body?.slice(0, 500) ?? null,
  });
}
