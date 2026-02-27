import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/service-client";
import { getExecutionStatus } from "@/lib/oneclick";
import { apiError, apiSuccess } from "@/lib/api-response";
import { checkRateLimit, withRateLimitHeaders } from "@/lib/rate-limit";
import { withCors, handleCorsOptions } from "@/lib/cors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// OPTIONS — CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/checkout/[id]/status — Public. Lightweight status polling for checkout page.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit
  const rl = await checkRateLimit(request, "checkout-status");
  if (!rl.allowed) return withCors(request, rl.response!);

  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return withCors(request, apiError("Invalid payment ID", 400));
  }

  const supabase = getServiceClient();

  const { data: payment, error } = await supabase
    .from("payments")
    .select(
      "id, status, send_tx_hash, fulfillment_tx_hash, confirmed_at, expires_at, deposit_address, customer_chain"
    )
    .eq("id", id)
    .single();

  if (error || !payment) {
    return withCors(request, apiError("Payment not found", 404));
  }

  // If processing with a deposit address, check 1Click for live status
  if (payment.status === "processing" && payment.deposit_address) {
    try {
      const execution = await getExecutionStatus(payment.deposit_address);
      const oneClickStatus =
        typeof execution === "object" && execution !== null
          ? (execution as Record<string, unknown>).status
          : undefined;

      const response = apiSuccess({
        status: payment.status,
        sendTxHash: payment.send_tx_hash,
        fulfillmentTxHash:
          (execution as Record<string, unknown>)?.fulfillmentTxHash ??
          payment.fulfillment_tx_hash,
        confirmedAt: payment.confirmed_at,
        expiresAt: payment.expires_at,
        customerChain: payment.customer_chain,
        oneClickStatus,
      });
      return withCors(request, withRateLimitHeaders(response, "checkout-status", rl.remaining));
    } catch {
      // Fall through to return DB-only data
    }
  }

  const response = apiSuccess({
    status: payment.status,
    sendTxHash: payment.send_tx_hash,
    fulfillmentTxHash: payment.fulfillment_tx_hash,
    confirmedAt: payment.confirmed_at,
    expiresAt: payment.expires_at,
    customerChain: payment.customer_chain,
  });
  return withCors(request, withRateLimitHeaders(response, "checkout-status", rl.remaining));
}
