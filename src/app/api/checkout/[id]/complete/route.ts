import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { dispatchWebhooks } from "@/lib/webhooks";
import { logAudit } from "@/lib/audit";
import { checkRateLimit, withRateLimitHeaders } from "@/lib/rate-limit";
import { withCors, handleCorsOptions } from "@/lib/cors";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Minimal validation: non-empty string that could be a crypto address (8+ hex-ish chars)
function isPlausibleAddress(addr: unknown): addr is string {
  return typeof addr === "string" && addr.trim().length >= 8;
}

// OPTIONS — CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// POST /api/checkout/[id]/complete — Mark payment as processing (customer sent tx).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit
  const rl = await checkRateLimit(request, "checkout-complete");
  if (!rl.allowed) return withCors(request, rl.response!);

  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return withCors(request, apiError("Invalid payment ID", 400));
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return withCors(request, apiError("Invalid JSON body", 400));
  }

  const { sendTxHash, depositAddress, payerAddress, payerChain } = body as {
    sendTxHash: string;
    depositAddress: string;
    payerAddress: string;
    payerChain: string;
  };

  if (!sendTxHash || !payerAddress || !payerChain) {
    return withCors(request, apiError("sendTxHash, payerAddress, and payerChain are required", 400));
  }

  // Require a valid-looking deposit address
  if (!isPlausibleAddress(depositAddress)) {
    return withCors(request, apiError("depositAddress is required and must be a valid address", 400));
  }

  const supabase = getServiceClient();

  // Verify payment exists and is pending
  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("id, status, deposit_address, merchant_id, amount, currency")
    .eq("id", id)
    .single();

  if (fetchError || !payment) {
    return withCors(request, apiError("Payment not found", 404));
  }

  if (payment.status !== "pending") {
    return withCors(request, apiError(`Payment is ${payment.status}, expected pending`, 409));
  }

  // If the payment already has a deposit_address set, the caller must match it
  if (payment.deposit_address && payment.deposit_address !== depositAddress) {
    return withCors(request, apiError("depositAddress does not match the existing deposit address for this payment", 400));
  }

  const { data: updated, error } = await supabase
    .from("payments")
    .update({
      status: "processing",
      customer_wallet: payerAddress,
      customer_chain: payerChain,
      send_tx_hash: sendTxHash,
      deposit_address: depositAddress,
    })
    .eq("id", id)
    .eq("status", "pending") // Idempotency guard
    .select("id, amount, currency, status")
    .single();

  if (error || !updated) {
    return withCors(request, apiError("Failed to update payment", 500));
  }

  // Dispatch webhook
  dispatchWebhooks(payment.merchant_id, {
    event: "payment.processing",
    paymentId: id,
    merchantId: payment.merchant_id,
    timestamp: new Date().toISOString(),
    data: {
      amount: updated.amount,
      currency: updated.currency,
      status: "processing",
      sendTxHash,
      payerAddress,
      payerChain,
    },
  });

  logAudit({
    merchantId: payment.merchant_id,
    actor: "checkout",
    action: "payment.processing",
    resourceType: "payment",
    resourceId: id,
    metadata: { payerAddress, payerChain },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return withCors(request, withRateLimitHeaders(apiSuccess({ status: "processing", id }), "checkout-complete", rl.remaining));
}

// PATCH /api/checkout/[id]/complete — Confirm or fail a payment.
// Only callable by the cron settler (requires CRON_SECRET).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify CRON_SECRET — only the settle-payments cron may confirm/fail payments
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return apiError("CRON_SECRET not configured", 500);
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return apiError("Invalid payment ID", 400);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { fulfillmentTxHash, outcome } = body as {
    fulfillmentTxHash?: string;
    outcome: "confirmed" | "failed";
  };

  if (!outcome || (outcome !== "confirmed" && outcome !== "failed")) {
    return apiError("outcome must be 'confirmed' or 'failed'", 400);
  }

  const supabase = getServiceClient();

  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("id, status, merchant_id, amount, currency")
    .eq("id", id)
    .single();

  if (fetchError || !payment) {
    return apiError("Payment not found", 404);
  }

  if (payment.status !== "processing") {
    return apiError(`Payment is ${payment.status}, expected processing`, 409);
  }

  const updateData: Record<string, unknown> = {
    status: outcome,
  };

  if (outcome === "confirmed") {
    updateData.confirmed_at = new Date().toISOString();
    if (fulfillmentTxHash) {
      updateData.fulfillment_tx_hash = fulfillmentTxHash;
    }
  }

  const { data: updated, error } = await supabase
    .from("payments")
    .update(updateData)
    .eq("id", id)
    .eq("status", "processing") // Idempotency guard
    .select("id, amount, currency, status")
    .single();

  if (error || !updated) {
    return apiError("Failed to update payment", 500);
  }

  // Dispatch webhook
  const event = outcome === "confirmed" ? "payment.confirmed" : "payment.failed";
  dispatchWebhooks(payment.merchant_id, {
    event,
    paymentId: id,
    merchantId: payment.merchant_id,
    timestamp: new Date().toISOString(),
    data: {
      amount: updated.amount,
      currency: updated.currency,
      status: outcome,
      fulfillmentTxHash: fulfillmentTxHash || null,
    },
  });

  logAudit({
    merchantId: payment.merchant_id,
    actor: "system",
    action: `payment.${outcome}`,
    resourceType: "payment",
    resourceId: id,
    metadata: { fulfillmentTxHash: fulfillmentTxHash ?? null },
  });

  return apiSuccess({ status: outcome, id });
}
