import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/service-client";
import { processRetryDelivery } from "@/lib/webhooks";
import { apiError, apiSuccess } from "@/lib/api-response";

// GET /api/cron/retry-webhooks — Retries failed webhook deliveries.
// Picks up rows where response_status IS NULL (queued for retry),
// attempt <= 3, and created within the last hour.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return apiError("CRON_SECRET not configured", 500);
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return apiError("Unauthorized", 401);
  }

  const supabase = getServiceClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Fetch pending retry deliveries: no response_status yet, within the last hour
  const { data: pendingDeliveries, error } = await supabase
    .from("webhook_deliveries")
    .select("id, webhook_endpoint_id, event, payload, attempt")
    .is("response_status", null)
    .is("delivered_at", null)
    .lte("attempt", 3)
    .gte("created_at", oneHourAgo)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[retry-webhooks] Failed to fetch pending deliveries:", error.message);
    return apiError("Failed to fetch pending deliveries", 500);
  }

  const results = { retried: 0, succeeded: 0, failed: 0 };

  for (const delivery of pendingDeliveries ?? []) {
    results.retried++;
    const success = await processRetryDelivery(delivery);
    if (success) {
      results.succeeded++;
    } else {
      results.failed++;
    }
  }

  console.log("[retry-webhooks] Run complete:", results);

  return apiSuccess({ ok: true, results });
}
