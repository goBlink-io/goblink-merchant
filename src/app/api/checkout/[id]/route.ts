import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { checkRateLimit, withRateLimitHeaders } from "@/lib/rate-limit";
import { withCors, handleCorsOptions } from "@/lib/cors";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// OPTIONS — CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/checkout/[id] — Public. Fetch payment + merchant info for checkout page.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit
  const rl = await checkRateLimit(request, "checkout-get");
  if (!rl.allowed) return withCors(request, rl.response!);

  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return withCors(request, apiError("Invalid payment ID", 400));
  }

  const supabase = getServiceClient();

  // Select only the fields needed — no select("*")
  const { data: payment, error } = await supabase
    .from("payments")
    .select(
      "id, merchant_id, amount, currency, status, external_order_id, deposit_address, return_url, metadata, expires_at, confirmed_at, created_at, send_tx_hash, fulfillment_tx_hash, customer_wallet, customer_chain, is_test"
    )
    .eq("id", id)
    .single();

  if (error || !payment) {
    return withCors(request, apiError("Payment not found", 404));
  }

  // Check if expired
  if (payment.expires_at && new Date(payment.expires_at) < new Date()) {
    if (payment.status === "pending") {
      await supabase
        .from("payments")
        .update({ status: "expired" })
        .eq("id", id);
      payment.status = "expired";
    }
  }

  // Fetch merchant info — only needed fields
  const { data: merchant } = await supabase
    .from("merchants")
    .select("business_name, logo_url, brand_color, wallet_address, settlement_token, settlement_chain, show_powered_badge")
    .eq("id", payment.merchant_id)
    .single();

  const response = apiSuccess({
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
      isTest: payment.is_test,
    },
    merchant: merchant
      ? {
          businessName: merchant.business_name,
          logoUrl: merchant.logo_url,
          brandColor: merchant.brand_color,
          walletAddress: merchant.wallet_address,
          settlementToken: merchant.settlement_token,
          settlementChain: merchant.settlement_chain,
          showPoweredBadge: merchant.show_powered_badge ?? true,
        }
      : null,
  });

  return withCors(request, withRateLimitHeaders(response, "checkout-get", rl.remaining));
}
