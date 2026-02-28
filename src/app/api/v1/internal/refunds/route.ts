import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { dispatchWebhooks } from "@/lib/webhooks";
import { logAudit } from "@/lib/audit";
import { insertNotification } from "@/lib/notifications";
import { notifyRefundIssued } from "@/lib/email/triggers";

// POST /api/v1/internal/refunds — Issue refund (session-authenticated)
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

  // Fetch the original payment
  const { data: payment, error: paymentError } = await serviceClient
    .from("payments")
    .select("*")
    .eq("id", payment_id)
    .eq("merchant_id", merchant.id)
    .single();

  if (paymentError || !payment) {
    return apiError("Payment not found", 404);
  }

  // Only confirmed or partially_refunded payments can be refunded
  if (!["confirmed", "partially_refunded"].includes(payment.status)) {
    return apiError(
      `Cannot refund a payment with status "${payment.status}". Only confirmed payments can be refunded.`,
      400
    );
  }

  // Calculate total already refunded
  const { data: existingRefunds } = await serviceClient
    .from("refunds")
    .select("amount")
    .eq("payment_id", payment_id)
    .in("status", ["pending", "processing", "completed"]);

  const totalRefunded = (existingRefunds ?? []).reduce(
    (sum: number, r: { amount: number }) => sum + Number(r.amount),
    0
  );

  const refundAmount = amount
    ? Number(amount)
    : Number(payment.amount) - totalRefunded;

  if (refundAmount <= 0) {
    return apiError("Refund amount must be positive", 400);
  }

  if (totalRefunded + refundAmount > Number(payment.amount)) {
    return apiError(
      `Refund amount ($${refundAmount}) exceeds remaining refundable amount ($${Number(payment.amount) - totalRefunded})`,
      400
    );
  }

  const isFullRefund =
    totalRefunded + refundAmount >= Number(payment.amount);

  // Create the refund record
  const { data: refund, error: refundError } = await serviceClient
    .from("refunds")
    .insert({
      payment_id,
      merchant_id: merchant.id,
      amount: refundAmount,
      currency: payment.currency,
      reason: reason || null,
      status: "pending",
    })
    .select("*")
    .single();

  if (refundError || !refund) {
    return apiError(
      `Failed to create refund: ${refundError?.message}`,
      500
    );
  }

  // Update payment status
  const newStatus = isFullRefund ? "refunded" : "partially_refunded";
  await serviceClient
    .from("payments")
    .update({ status: newStatus })
    .eq("id", payment_id);

  // Dispatch webhook
  const eventName = isFullRefund
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
      reason: refund.reason,
      originalAmount: payment.amount,
      totalRefunded: totalRefunded + refundAmount,
    },
  });

  logAudit({
    merchantId: merchant.id,
    actor: user.id,
    action: isFullRefund ? "payment.refunded" : "payment.partially_refunded",
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
    isFullRefund ? "Refund Issued" : "Partial Refund Issued",
    `$${refundAmount} ${payment.currency} refund for payment ${payment_id.slice(0, 8)}`,
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
      status: refund.status,
      reason: refund.reason,
      created_at: refund.created_at,
    },
    201
  );
}
