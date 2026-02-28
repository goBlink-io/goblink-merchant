import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getExplorerTxUrl } from "@/lib/explorer";
import { withCors, handleCorsOptions } from "@/lib/cors";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/checkout/[id]/receipt — Returns receipt data as JSON.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return withCors(request, apiError("Invalid payment ID", 400));
  }

  const supabase = getServiceClient();

  const { data: payment, error: paymentErr } = await supabase
    .from("payments")
    .select(
      "id, amount, currency, status, external_order_id, confirmed_at, created_at, send_tx_hash, fulfillment_tx_hash, customer_wallet, customer_chain, merchant_id, metadata"
    )
    .eq("id", id)
    .single();

  if (paymentErr || !payment) {
    return withCors(request, apiError("Payment not found", 404));
  }

  if (payment.status !== "confirmed") {
    return withCors(request, apiError("Receipt is only available for confirmed payments", 400));
  }

  // Fetch merchant info
  const { data: merchant } = await supabase
    .from("merchants")
    .select("business_name, logo_url, brand_color, settlement_token, settlement_chain")
    .eq("id", payment.merchant_id)
    .single();

  const chain = payment.customer_chain || merchant?.settlement_chain;
  const explorerUrl =
    chain && payment.fulfillment_tx_hash
      ? getExplorerTxUrl(chain, payment.fulfillment_tx_hash)
      : null;

  const receipt = {
    paymentId: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    orderId: payment.external_order_id,
    confirmedAt: payment.confirmed_at,
    createdAt: payment.created_at,
    sendTxHash: payment.send_tx_hash,
    fulfillmentTxHash: payment.fulfillment_tx_hash,
    customerWallet: payment.customer_wallet,
    customerChain: payment.customer_chain,
    explorerUrl,
    merchant: merchant
      ? {
          businessName: merchant.business_name,
          logoUrl: merchant.logo_url,
          brandColor: merchant.brand_color,
          settlementToken: merchant.settlement_token,
          settlementChain: merchant.settlement_chain,
        }
      : null,
  };

  return withCors(request, apiSuccess(receipt));
}
