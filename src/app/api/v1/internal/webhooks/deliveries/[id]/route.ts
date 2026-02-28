import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getDeliveryDetail } from "@/lib/webhooks/queries";

// GET /api/v1/internal/webhooks/deliveries/:id — Get single delivery detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401);
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return apiError("Merchant not found", 404);
  }

  const { id } = await params;

  try {
    const delivery = await getDeliveryDetail(id, merchant.id);
    if (!delivery) {
      return apiError("Delivery not found", 404);
    }
    return apiSuccess(delivery);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch delivery";
    return apiError(message, 500);
  }
}
