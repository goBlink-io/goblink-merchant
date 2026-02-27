import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { deliverWebhook } from "@/lib/webhooks";
import { apiError, apiSuccess } from "@/lib/api-response";
import crypto from "crypto";

// POST /api/v1/internal/webhooks/:id/test — Send test event (session auth)
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

  // Get the endpoint and verify ownership through the merchant
  const { data: endpoint, error } = await serviceClient
    .from("webhook_endpoints")
    .select("id, url, secret, merchant_id")
    .eq("id", id)
    .single();

  if (error || !endpoint) {
    return apiError("Webhook endpoint not found", 404);
  }

  // Verify the user owns this merchant
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("id", endpoint.merchant_id)
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return apiError("Webhook endpoint not found", 404);
  }

  const testEvent = {
    event: "payment.confirmed",
    paymentId: `test_${crypto.randomUUID()}`,
    merchantId: endpoint.merchant_id,
    timestamp: new Date().toISOString(),
    data: {
      amount: "25.00",
      currency: "USD",
      feeAmount: 0.25,
      netAmount: 24.75,
      status: "confirmed",
      fulfillmentTxHash: `0x${"a".repeat(64)}`,
      sendTxHash: `0x${"b".repeat(64)}`,
      _test: true,
    },
  };

  const result = await deliverWebhook(endpoint.id, endpoint.url, endpoint.secret, testEvent);

  return apiSuccess({
    delivered: result.success,
    responseStatus: result.status,
    responseBody: result.body?.slice(0, 500) ?? null,
  });
}
