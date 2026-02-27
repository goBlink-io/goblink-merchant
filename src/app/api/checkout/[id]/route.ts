import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/checkout/[id] — Public. Fetch payment + merchant info for checkout page.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return apiError("Invalid payment ID", 400);
  }

  const supabase = getServiceClient();

  const { data: payment, error } = await supabase
    .from("payments")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !payment) {
    return apiError("Payment not found", 404);
  }

  // Check if expired
  if (payment.expires_at && new Date(payment.expires_at) < new Date()) {
    if (payment.status === "pending") {
      // Mark as expired
      await supabase
        .from("payments")
        .update({ status: "expired" })
        .eq("id", id);
      payment.status = "expired";
    }
  }

  // Fetch merchant info
  const { data: merchant } = await supabase
    .from("merchants")
    .select("business_name, logo_url, brand_color, wallet_address, settlement_token, settlement_chain")
    .eq("id", payment.merchant_id)
    .single();

  return apiSuccess({
    payment: {
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      orderId: payment.external_order_id,
      depositAddress: payment.deposit_address,
      returnUrl: payment.return_url,
      metadata: payment.metadata,
      expiresAt: payment.expires_at,
      confirmedAt: payment.confirmed_at,
      createdAt: payment.created_at,
      sendTxHash: payment.send_tx_hash,
      fulfillmentTxHash: payment.fulfillment_tx_hash,
      customerWallet: payment.customer_wallet,
      customerChain: payment.customer_chain,
    },
    merchant: merchant
      ? {
          businessName: merchant.business_name,
          logoUrl: merchant.logo_url,
          brandColor: merchant.brand_color,
          walletAddress: merchant.wallet_address,
          settlementToken: merchant.settlement_token,
          settlementChain: merchant.settlement_chain,
        }
      : null,
  });
}
