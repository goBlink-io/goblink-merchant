import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";

// GET /api/v1/payments/:id — Get payment details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await validateApiKey(request.headers.get("authorization"));
  if (!auth) {
    return apiError("Invalid or missing API key", 401);
  }

  const supabase = getServiceClient();

  const { data: payment, error } = await supabase
    .from("payments")
    .select("*")
    .eq("id", id)
    .eq("merchant_id", auth.merchantId)
    .single();

  if (error || !payment) {
    return apiError("Payment not found", 404);
  }

  // Also fetch refunds
  const { data: refunds } = await supabase
    .from("refunds")
    .select("id, amount, currency, status, reason, created_at")
    .eq("payment_id", id);

  return apiSuccess({
    id: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    orderId: payment.external_order_id,
    cryptoAmount: payment.crypto_amount,
    cryptoToken: payment.crypto_token,
    cryptoChain: payment.crypto_chain,
    customerWallet: payment.customer_wallet,
    customerChain: payment.customer_chain,
    customerToken: payment.customer_token,
    depositAddress: payment.deposit_address,
    sendTxHash: payment.send_tx_hash,
    fulfillmentTxHash: payment.fulfillment_tx_hash,
    feeAmount: payment.fee_amount,
    feeCurrency: payment.fee_currency,
    netAmount: payment.net_amount,
    paymentUrl: payment.payment_url,
    returnUrl: payment.return_url,
    metadata: payment.metadata,
    expiresAt: payment.expires_at,
    confirmedAt: payment.confirmed_at,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at,
    refunds: (refunds ?? []).map((r) => ({
      id: r.id,
      amount: r.amount,
      currency: r.currency,
      status: r.status,
      reason: r.reason,
      createdAt: r.created_at,
    })),
  });
}
