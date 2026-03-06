import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { dispatchWebhooks } from "@/lib/webhooks";
import { logAudit } from "@/lib/audit";
import { insertNotification } from "@/lib/notifications";
import { notifyRefundIssued } from "@/lib/email/triggers";

// POST /api/v1/internal/refunds — Issue refund (session-authenticated, atomic)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return apiError("Unauthorized", 401);

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) return apiError("Merchant not found", 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { payment_id, amount, reason } = body as {
    payment_id?: string;
    amount?: string | number;
    reason?: string;
  };

  if (!payment_id) {
    return apiError("payment_id is required", 400);
  }

  const serviceClient = getServiceClient();

  // Need payment amount to calculate default refund amount
  const { data: payment, error: paymentError } = await serviceClient
    .from("payments")
    .select("amount, currency")
    .eq("id", payment_id)
    .eq("merchant_id", merchant.id)
    .single();

  if (paymentError || !payment) {
    return apiError("Payment not found", 404);
  }

  const refundAmount = amount ? Number(amount) : Number(payment.amount);

  if (isNaN(refundAmount) || refundAmount <= 0) {
    return apiError("Refund amount must be positive", 400);
  }

  // Atomic refund: locks payment row, validates status + amounts, inserts refund, updates payment status
  const { data: result, error: rpcError } = await serviceClient.rpc("create_refund_atomic", {
    p_payment_id: payment_id,
    p_amount: refundAmount,
    p_reason: reason || null,
    p_merchant_id: merchant.id,
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
  const eventName = refund.is_full_refund
    ? "payment.refunded"
    : "payment.partially_refunded";
  dispatchWebhooks(merchant.id, {
    event: eventName,
    paymentId: payment_id,
    merchantId: merchant.id,
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
    merchantId: merchant.id,
    actor: user.id,
    action: eventName,
    resourceType: "payment",
    resourceId: payment_id,
    metadata: {
      refundId: refund.id,
      amount: refundAmount,
      reason: reason || null,
    },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  // In-app notification
  insertNotification(
    merchant.id,
    "payment_received",
    refund.is_full_refund ? "Refund Issued" : "Partial Refund Issued",
    `$${refundAmount} ${refund.currency} refund for payment ${payment_id.slice(0, 8)}`,
    `/dashboard/payments/${payment_id}`
  );

  // Email notification
  notifyRefundIssued(refund.id);

  return apiSuccess(
    {
      id: refund.id,
      payment_id,
      amount: refund.amount,
      currency: refund.currency,
      status: "pending",
      reason: reason || null,
    },
    201
  );
}
