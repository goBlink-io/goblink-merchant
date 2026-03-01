import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { checkRateLimit, withRateLimitHeaders } from "@/lib/rate-limit";
import { withCors, handleCorsOptions } from "@/lib/cors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// POST /api/checkout/[id]/retry — Create a new payment with the same parameters
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(request, "checkout-retry");
  if (!rl.allowed) return withCors(request, rl.response!);

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return withCors(request, apiError("Invalid payment ID", 400));
  }

  const supabase = getServiceClient();

  // Fetch original payment
  const { data: original, error } = await supabase
    .from("payments")
    .select(
      "merchant_id, amount, currency, external_order_id, return_url, metadata, is_test"
    )
    .eq("id", id)
    .in("status", ["failed", "expired", "refunded"])
    .single();

  if (error || !original) {
    return withCors(
      request,
      apiError("Payment not found or not in a retriable state", 404)
    );
  }

  // Create new payment with same parameters
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  const { data: newPayment, error: insertErr } = await supabase
    .from("payments")
    .insert({
      merchant_id: original.merchant_id,
      amount: original.amount,
      currency: original.currency,
      external_order_id: original.external_order_id,
      return_url: original.return_url,
      metadata: { ...(original.metadata as object), retried_from: id },
      is_test: original.is_test,
      status: "pending",
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (insertErr || !newPayment) {
    return withCors(request, apiError("Failed to create retry payment", 500));
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://merchant.goblink.io";
  const response = apiSuccess({
    paymentId: newPayment.id,
    paymentUrl: `${baseUrl}/pay/${newPayment.id}`,
  });
  return withCors(
    request,
    withRateLimitHeaders(response, "checkout-retry", rl.remaining)
  );
}
