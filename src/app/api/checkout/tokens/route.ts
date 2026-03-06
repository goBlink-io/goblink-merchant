import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getTokens } from "@/lib/oneclick";
import { checkRateLimit, withRateLimitHeaders } from "@/lib/rate-limit";
import { withCors, handleCorsOptions } from "@/lib/cors";

// OPTIONS — CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/checkout/tokens — Public. Proxy to 1Click getTokens().
export async function GET(request: NextRequest) {
  // Rate limit
  const rl = await checkRateLimit(request, "checkout-tokens", undefined, true);
  if (!rl.allowed) return withCors(request, rl.response!);

  try {
    const tokens = await getTokens();
    return withCors(request, withRateLimitHeaders(apiSuccess(tokens), "checkout-tokens", rl.remaining));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch tokens";
    return withCors(request, apiError(message, 502));
  }
}
