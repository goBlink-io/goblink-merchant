import { NextRequest } from "next/server";
import { validateApiKey, isApiForbidden } from "@/lib/api-auth";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { dispatchWebhooks } from "@/lib/webhooks";
import { logAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";

// POST /api/v1/payments/:id/refund — Initiate refund (atomic)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: paymentId } = await params;
  const auth = await validateApiKey(request.headers.get("authorization"), request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for"));
  if (isApiForbidden(auth)) {
    return apiError("IP address not allowed for this API key", 403);
  }
  if (!auth) {
    return apiError("Invalid or missing API key", 401);
  }

  // Rate limit by API key ID (fail-closed for refunds)
  const rl = await checkRateLimit(request, "api-refund", auth.keyId);
  if (!rl.allowed) return rl.response!;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { amount, reason } = body as {
    amount?: string | number;
    reason?: string;
  };

  const supabase = getServiceClient();

  // Need payment amount to calculate default refund amount
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("amount, currency")
    .eq("id", paymentId)
    .eq("merchant_id", auth.merchantId)
    .single();

  if (paymentError || !payment) {
    return apiError("Payment not found", 404);
  }

  const refundAmount = amount ? Number(amount) : Number(payment.amount);

  if (isNaN(refundAmount) || refundAmount <= 0) {
    return apiError("Refund amount must be positive", 400);
  }

  // Atomic refund: locks payment row, validates status + amounts, inserts refund, updates payment status
  const { data: result, error: rpcError } = await supabase.rpc("create_refund_atomic", {
    p_payment_id: paymentId,
    p_amount: refundAmount,
    p_reason: reason || null,
    p_merchant_id: auth.merchantId,
  });

  if (rpcError) {
    const msg = rpcError.message;
    if (msg.includes("payment_not_found")) return apiError("Payment not found", 404);
    if (msg.includes("payment_not_refundable")) return apiError("Payment cannot be refunded in its current status", 400);
    if (msg.includes("exceeds_payment_amount")) return apiError("Refund amount exceeds remaining refundable amount", 400);
    return apiError(`Failed to create refund: ${msg}`, 500);
  }

  const refund = result as { id: string; amount: number; currency: string; is_full_refund: boolean; total_refunded: number };

  // Dispatch webhook
  const eventName = refund.is_full_refund ? "payment.refunded" : "payment.partially_refunded";
  dispatchWebhooks(auth.merchantId, {
    event: eventName,
    paymentId,
    merchantId: auth.merchantId,
    timestamp: new Date().toISOString(),
    data: {
      refundId: refund.id,
      amount: refund.amount,
      currency: refund.currency,
      reason: reason || null,
      originalAmount: payment.amount,
      totalRefunded: refund.total_refunded,
    },
  });

  logAudit({
    merchantId: auth.merchantId,
    actor: auth.keyId,
    action: eventName,
    resourceType: "payment",
    resourceId: paymentId,
    metadata: { refundId: refund.id, amount: refundAmount, reason: reason || null },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return apiSuccess(
    {
      id: refund.id,
      paymentId,
      amount: refund.amount,
      currency: refund.currency,
      status: "pending",
      reason: reason || null,
    },
    201
  );
}
