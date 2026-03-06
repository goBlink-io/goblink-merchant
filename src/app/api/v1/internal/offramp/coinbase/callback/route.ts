import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/v1/internal/offramp/coinbase/callback
// Handles redirect back from Coinbase after offramp completion
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Coinbase may pass transaction status as query params
  const status = request.nextUrl.searchParams.get("status");
  const txId = request.nextUrl.searchParams.get("transactionId");

  // Redirect back to the offramp dashboard with status info
  const redirectUrl = new URL("/dashboard/offramp", appUrl);
  if (status) redirectUrl.searchParams.set("cb_status", status);
  if (txId) redirectUrl.searchParams.set("cb_tx", txId);

  return NextResponse.redirect(redirectUrl);
}
