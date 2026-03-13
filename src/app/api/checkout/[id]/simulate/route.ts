import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { dispatchWebhooks } from "@/lib/webhooks";
import { logAudit } from "@/lib/audit";
import { checkRateLimit, withRateLimitHeaders } from "@/lib/rate-limit";
import { withCors, handleCorsOptions } from "@/lib/cors";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// OPTIONS — CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// POST /api/checkout/[id]/simulate — Simulate a test payment confirmation.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(request, "checkout-complete", undefined, true);
  if (!rl.allowed) return withCors(request, rl.response!);

  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return withCors(request, apiError("Invalid payment ID", 400));
  }

  const supabase = getServiceClient();

  // Fetch payment
  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("id, status, merchant_id, amount, currency, is_test")
    .eq("id", id)
    .single();

  if (fetchError || !payment) {
    return withCors(request, apiError("Payment not found", 404));
  }

  // Security: only test payments can be simulated
  if (!payment.is_test) {
    return withCors(request, apiError("Only test payments can be simulated", 403));
  }

  if (payment.status !== "pending" && payment.status !== "processing") {
    return withCors(
      request,
      apiError(`Payment is ${payment.status}, expected pending or processing`, 409)
    );
  }

  const fakeTxHash = `test_tx_${crypto.randomUUID()}`;

  // Move to processing first
  if (payment.status === "pending") {
    await supabase
      .from("payments")
      .update({
        status: "processing",
        customer_wallet: "0xTEST_SIMULATED_WALLET",
        customer_chain: "test",
        send_tx_hash: fakeTxHash,
      })
      .eq("id", id);

    await dispatchWebhooks(payment.merchant_id, {
      event: "payment.processing",
      paymentId: id,
      merchantId: payment.merchant_id,
      timestamp: new Date().toISOString(),
      data: {
        amount: payment.amount,
        currency: payment.currency,
        status: "processing",
        sendTxHash: fakeTxHash,
        isTest: true,
      },
    });
  }

  // Confirm the payment — guard on status to prevent overwriting a real confirmed payment
  const { error: confirmError } = await supabase
    .from("payments")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      fulfillment_tx_hash: fakeTxHash,
      send_tx_hash: fakeTxHash,
      customer_wallet: "0xTEST_SIMULATED_WALLET",
      customer_chain: "test",
    })
    .eq("id", id)
    .eq("status", "processing");

  if (confirmError) {
    return withCors(request, apiError("Failed to confirm test payment", 500));
  }

  // Dispatch confirmed webhook — must await in serverless
  await dispatchWebhooks(payment.merchant_id, {
    event: "payment.confirmed",
    paymentId: id,
    merchantId: payment.merchant_id,
    timestamp: new Date().toISOString(),
    data: {
      amount: payment.amount,
      currency: payment.currency,
      status: "confirmed",
      fulfillmentTxHash: fakeTxHash,
      isTest: true,
    },
  });

  await logAudit({
    merchantId: payment.merchant_id,
    actor: "test-simulate",
    action: "payment.test_confirmed",
    resourceType: "payment",
    resourceId: id,
    metadata: { fakeTxHash },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  const response = apiSuccess({
    status: "confirmed",
    id,
    txHash: fakeTxHash,
    isTest: true,
  });

  return withCors(request, withRateLimitHeaders(response, "checkout-complete", rl.remaining));
}
