import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";

// GET /api/v1/internal/webhooks/:id/deliveries — List deliveries (session auth)
export async function GET(
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

  // Get endpoint and verify ownership
  const { data: endpoint } = await serviceClient
    .from("webhook_endpoints")
    .select("id, merchant_id")
    .eq("id", id)
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
    return apiError("Webhook endpoint not found", 404);
  }

  const { data: deliveries, error } = await serviceClient
    .from("webhook_deliveries")
    .select("id, event, payload, response_status, response_body, attempt, delivered_at, created_at")
    .eq("webhook_endpoint_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return apiError("Failed to fetch deliveries", 500);
  }

  return apiSuccess({
    data: deliveries ?? [],
  });
}
