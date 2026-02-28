import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getWebhookDeliveries } from "@/lib/webhooks/queries";

// GET /api/v1/internal/webhooks/deliveries — List all delivery attempts for merchant
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401);
  }

  // Get merchant for this user
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return apiError("Merchant not found", 404);
  }

  const searchParams = request.nextUrl.searchParams;
  const endpointId = searchParams.get("endpoint_id") || undefined;
  const eventType = searchParams.get("event_type") || undefined;
  const status = searchParams.get("status") as "success" | "failed" | undefined;
  const search = searchParams.get("search") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

  try {
    const result = await getWebhookDeliveries(merchant.id, {
      endpointId,
      eventType,
      status: status === "success" || status === "failed" ? status : undefined,
      search,
      page,
      limit,
    });

    return apiSuccess(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch deliveries";
    return apiError(message, 500);
  }
}
