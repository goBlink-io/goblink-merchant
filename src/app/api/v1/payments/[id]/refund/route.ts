import { NextRequest } from "next/server";
import { validateApiKey, isApiForbidden } from "@/lib/api-auth";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { dispatchWebhooks } from "@/lib/webhooks";
import { logAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";

// POST /api/v1/payments/:id/refund — Initiate refund
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: paymentId } = await params;
  const auth = await validateApiKey(request.headers.get("authorization"), request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"));
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

  // Fetch the original payment
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .eq("merchant_id", auth.merchantId)
    .single();

  if (paymentError || !payment) {
    return apiError("Payment not found", 404);
  }

  // Only confirmed payments can be refunded
  if (!["confirmed", "partially_refunded"].includes(payment.status)) {
    return apiError(
      `Cannot refund a payment with status "${payment.status}". Only confirmed payments can be refunded.`,
      400
    );
  }

  // Calculate total already refunded
  const { data: existingRefunds } = await supabase
    .from("refunds")
    .select("amount")
    .eq("payment_id", paymentId)
    .in("status", ["pending", "processing", "completed"]);

  const totalRefunded = (existingRefunds ?? []).reduce(
    (sum, r) => sum + Number(r.amount),
    0
  );

  const refundAmount = amount ? Number(amount) : Number(payment.amount) - totalRefunded;

  if (refundAmount <= 0) {
    return apiError("Refund amount must be positive", 400);
  }

  if (totalRefunded + refundAmount > Number(payment.amount)) {
    return apiError(
      `Refund amount ($${refundAmount}) exceeds remaining refundable amount ($${Number(payment.amount) - totalRefunded})`,
      400
    );
  }

  const isFullRefund = totalRefunded + refundAmount >= Number(payment.amount);

  // Create the refund record
  const { data: refund, error: refundError } = await supabase
    .from("refunds")
    .insert({
      payment_id: paymentId,
      merchant_id: auth.merchantId,
      amount: refundAmount,
      currency: payment.currency,
      reason: reason || null,
      status: "pending",
    })
    .select("*")
    .single();

  if (refundError) {
    return apiError(`Failed to create refund: ${refundError.message}`, 500);
  }

  // Update payment status
  const newStatus = isFullRefund ? "refunded" : "partially_refunded";
  await supabase
    .from("payments")
    .update({ status: newStatus })
    .eq("id", paymentId);

  // Dispatch webhook
  const eventName = isFullRefund ? "payment.refunded" : "payment.partially_refunded";
  dispatchWebhooks(auth.merchantId, {
    event: eventName,
    paymentId,
    merchantId: auth.merchantId,
    timestamp: new Date().toISOString(),
    data: {
      refundId: refund.id,
      amount: refund.amount,
      currency: refund.currency,
      reason: refund.reason,
      originalAmount: payment.amount,
      totalRefunded: totalRefunded + refundAmount,
    },
  });

  logAudit({
    merchantId: auth.merchantId,
    actor: auth.keyId,
    action: isFullRefund ? "payment.refunded" : "payment.partially_refunded",
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
      status: refund.status,
      reason: refund.reason,
      createdAt: refund.created_at,
    },
    201
  );
}
