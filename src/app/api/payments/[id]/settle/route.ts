import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { initiateSettlement } from "@/lib/settlement";
import { logAudit } from "@/lib/audit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/payments/[id]/settle — Initiate 1Click settlement for a payment.
// Requires authenticated merchant session (dashboard).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return apiError("Invalid payment ID", 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401);
  }

  // Get merchant + verify ownership
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, wallet_address, settlement_chain, settlement_token")
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return apiError("Merchant not found", 404);
  }

  if (!merchant.wallet_address) {
    return apiError("Merchant wallet address is not configured", 400);
  }

  if (!merchant.settlement_chain || !merchant.settlement_token) {
    return apiError("Settlement chain and token must be configured", 400);
  }

  // Get payment (scoped to merchant)
  const { data: payment } = await supabase
    .from("payments")
    .select("id, amount, currency, status, deposit_address, settlement_status, customer_wallet, customer_chain, customer_token")
    .eq("id", id)
    .eq("merchant_id", merchant.id)
    .single();

  if (!payment) {
    return apiError("Payment not found", 404);
  }

  // Only settle pending payments (no deposit address yet)
  if (payment.status !== "pending") {
    return apiError(`Payment is ${payment.status}, expected pending`, 409);
  }

  if (payment.settlement_status && payment.settlement_status !== "none") {
    return apiError(`Settlement already ${payment.settlement_status}`, 409);
  }

  // Parse optional body for origin asset override
  let bodyOriginAsset: string | undefined;
  let bodyRefundTo: string | undefined;

  try {
    const body = await request.json();
    bodyOriginAsset = body.originAsset;
    bodyRefundTo = body.refundTo;
  } catch {
    // Body is optional
  }

  // Use customer's token as origin if available, otherwise require it in the body
  const originAsset = bodyOriginAsset || payment.customer_token;
  if (!originAsset) {
    return apiError("originAsset is required (customer token not set on payment)", 400);
  }

  // Refund address defaults to customer wallet
  const refundTo = bodyRefundTo || payment.customer_wallet;
  if (!refundTo) {
    return apiError("refundTo is required (customer wallet not set on payment)", 400);
  }

  try {
    const result = await initiateSettlement({
      paymentId: payment.id,
      amount: Number(payment.amount),
      originAsset,
      refundTo,
      merchantWallet: merchant.wallet_address,
      settlementChain: merchant.settlement_chain,
      settlementToken: merchant.settlement_token,
    });

    logAudit({
      merchantId: merchant.id,
      actor: user.id,
      action: "settlement.initiated",
      resourceType: "payment",
      resourceId: payment.id,
      metadata: {
        depositAddress: result.depositAddress,
        intentId: result.intentId,
        settlementChain: merchant.settlement_chain,
        settlementToken: merchant.settlement_token,
      },
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });

    return apiSuccess({
      paymentId: payment.id,
      depositAddress: result.depositAddress,
      intentId: result.intentId,
      amountIn: result.amountIn,
      amountOut: result.amountOut,
      settlementStatus: "pending",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Settlement initiation failed";
    console.error(`[settle] Failed to initiate settlement for ${id}:`, message);
    return apiError(message, 502);
  }
}
