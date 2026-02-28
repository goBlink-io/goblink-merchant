import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { refreshExchangeRates } from "@/lib/forex";

// GET /api/cron/refresh-rates — Vercel Cron endpoint.
// Refreshes exchange rates from Open Exchange Rates API hourly.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return apiError("CRON_SECRET not configured", 500);
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return apiError("Unauthorized", 401);
  }

  const result = await refreshExchangeRates();

  if (result.error) {
    console.error("[cron/refresh-rates]", result.error);
    return apiSuccess({
      message: "Exchange rate refresh failed",
      error: result.error,
      updated: result.updated,
    });
  }

  return apiSuccess({
    message: "Exchange rates refreshed",
    updated: result.updated,
  });
}
