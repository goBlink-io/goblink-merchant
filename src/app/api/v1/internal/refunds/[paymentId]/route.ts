import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";

// GET /api/v1/internal/refunds/:paymentId — List refunds for a payment (session-authenticated)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
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

  const serviceClient = getServiceClient();

  // Verify payment belongs to this merchant
  const { data: payment } = await serviceClient
    .from("payments")
    .select("id")
    .eq("id", paymentId)
    .eq("merchant_id", merchant.id)
    .single();

  if (!payment) return apiError("Payment not found", 404);

  const { data: refunds, error } = await serviceClient
    .from("refunds")
    .select("*")
    .eq("payment_id", paymentId)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError(`Failed to fetch refunds: ${error.message}`, 500);
  }

  return apiSuccess(refunds ?? []);
}
