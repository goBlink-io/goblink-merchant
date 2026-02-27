import { NextRequest, NextResponse } from "next/server";

const ALLOWED_METHODS = "GET, POST, PATCH, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Authorization";
const MAX_AGE = "86400"; // 24 hours

function getAllowedOrigins(): string[] {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const origins = ["https://merchant.goblink.io"];
  if (appUrl) {
    origins.push(appUrl);
  }
  // Allow localhost in development
  if (process.env.NODE_ENV === "development") {
    origins.push("http://localhost:3000");
  }
  return origins;
}

function getOriginHeader(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const allowed = getAllowedOrigins();
  if (allowed.includes(origin)) {
    return origin;
  }
  return null;
}

/** Add CORS headers to a response */
export function withCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = getOriginHeader(request);
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
    response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
    response.headers.set("Access-Control-Max-Age", MAX_AGE);
    response.headers.set("Vary", "Origin");
  }
  return response;
}

/** Handle OPTIONS preflight requests */
export function handleCorsOptions(request: NextRequest): NextResponse {
  const origin = getOriginHeader(request);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": MAX_AGE,
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return new NextResponse(null, { status: 204, headers });
}
