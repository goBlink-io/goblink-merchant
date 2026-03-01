import { NextRequest } from "next/server";
import { validateApiKey, isApiForbidden } from "@/lib/api-auth";
import { getServiceClient } from "@/lib/service-client";
import { deliverWebhook } from "@/lib/webhooks";
import { apiError, apiSuccess } from "@/lib/api-response";
import crypto from "crypto";

// POST /api/v1/webhooks/:id/test — Send a test webhook event (API key auth)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(request.headers.get("authorization"), request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"));
  if (isApiForbidden(auth)) {
    return apiError("IP address not allowed for this API key", 403);
  }
  if (!auth) {
    return apiError("Invalid or missing API key", 401);
  }

  const { id } = await params;
  const supabase = getServiceClient();

  const { data: endpoint, error } = await supabase
    .from("webhook_endpoints")
    .select("id, url, secret, merchant_id")
    .eq("id", id)
    .eq("merchant_id", auth.merchantId)
    .single();

  if (error || !endpoint) {
    return apiError("Webhook endpoint not found", 404);
  }

  const testEvent = {
    event: "payment.confirmed",
    paymentId: `test_${crypto.randomUUID()}`,
    merchantId: auth.merchantId,
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
