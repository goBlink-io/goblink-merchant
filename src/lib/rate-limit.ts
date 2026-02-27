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
  bucket: string
): Promise<{ allowed: boolean; remaining: number; response?: NextResponse }> {
  const config = RATE_LIMITS[bucket] || RATE_LIMITS["checkout-default"];
  const ip = getClientIp(request);
  const key = `${bucket}:${ip}`;

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_limit: config.max,
      p_window_seconds: config.window,
    });

    if (error || !data || data.length === 0) {
      // On error, allow the request (fail open) but log
      console.error("[rate-limit] RPC error:", error?.message);
      return { allowed: true, remaining: config.max };
    }

    const { allowed, remaining } = data[0] as { allowed: boolean; remaining: number };

    if (!allowed) {
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
      return { allowed: false, remaining: 0, response };
    }

    return { allowed: true, remaining };
  } catch (err) {
    // Fail open on unexpected errors
    console.error("[rate-limit] Unexpected error:", err);
    return { allowed: true, remaining: config.max };
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
