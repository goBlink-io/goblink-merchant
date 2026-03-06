import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/service-client";

interface RateLimitConfig {
  window: number; // seconds
  max: number;    // max requests per window
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "checkout-quote":    { window: 60, max: 20 },   // 20 quotes/min per IP
  "checkout-status":   { window: 60, max: 60 },   // 60 polls/min per IP
  "checkout-complete": { window: 60, max: 10 },   // 10 completions/min per IP
  "checkout-tokens":   { window: 60, max: 30 },   // 30 token fetches/min per IP
  "checkout-get":      { window: 60, max: 30 },   // 30 checkout page loads/min per IP
  "checkout-default":  { window: 60, max: 30 },   // 30 req/min default
  "api-create-payment":  { window: 60, max: 60 },   // 60 payments/min per API key
  "api-refund":          { window: 60, max: 10 },   // 10 refunds/min per API key
  "api-create-webhook":  { window: 60, max: 10 },   // 10 webhook registrations/min per API key
  "invoice-send":        { window: 3600, max: 3 },  // 3 sends/hour per merchant+recipient (M22)
};

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function checkRateLimit(
  request: NextRequest,
  bucket: string,
  keyOverride?: string,
  failOpen: boolean = false
): Promise<{ allowed: boolean; remaining: number; response?: NextResponse }> {
  const config = RATE_LIMITS[bucket] || RATE_LIMITS["checkout-default"];
  const key = keyOverride ? `${bucket}:${keyOverride}` : `${bucket}:${getClientIp(request)}`;

  const denyResponse = () => {
    const response = NextResponse.json(
      { error: { message: "Too many requests", status: 429 } },
      {
        status: 429,
        headers: {
          "Retry-After": String(config.window),
          "X-RateLimit-Limit": String(config.max),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(config.window),
        },
      }
    );
    return { allowed: false as const, remaining: 0, response };
  };

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_limit: config.max,
      p_window_seconds: config.window,
    });

    if (error || !data || data.length === 0) {
      console.error("[rate-limit] RPC error:", error?.message);
      if (failOpen) return { allowed: true, remaining: config.max };
      return denyResponse();
    }

    const { allowed, remaining } = data[0] as { allowed: boolean; remaining: number };

    if (!allowed) {
      return denyResponse();
    }

    return { allowed: true, remaining };
  } catch (err) {
    console.error("[rate-limit] Unexpected error:", err);
    if (failOpen) return { allowed: true, remaining: config.max };
    return denyResponse();
  }
}

/** Add rate limit headers to an existing response */
export function withRateLimitHeaders(
  response: NextResponse,
  bucket: string,
  remaining: number
): NextResponse {
  const config = RATE_LIMITS[bucket] || RATE_LIMITS["checkout-default"];
  response.headers.set("X-RateLimit-Limit", String(config.max));
  response.headers.set("X-RateLimit-Remaining", String(Math.max(0, remaining)));
  response.headers.set("X-RateLimit-Reset", String(config.window));
  return response;
}
