import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getQuote } from "@/lib/oneclick";
import { checkRateLimit, withRateLimitHeaders } from "@/lib/rate-limit";
import { withCors, handleCorsOptions } from "@/lib/cors";

// OPTIONS — CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// POST /api/checkout/quote — Public. Get a swap quote from 1Click.
export async function POST(request: NextRequest) {
  // Rate limit
  const rl = await checkRateLimit(request, "checkout-quote");
  if (!rl.allowed) return withCors(request, rl.response!);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return withCors(request, apiError("Invalid JSON body", 400));
  }

  const {
    originAsset,
    destinationAsset,
    amount,
    recipient,
    refundTo,
    swapType,
    slippageTolerance,
    dryRun,
  } = body as {
    originAsset: string;
    destinationAsset: string;
    amount: string;
    recipient: string;
    refundTo: string;
    swapType: "EXACT_INPUT" | "EXACT_OUTPUT";
    slippageTolerance?: number;
    dryRun?: boolean;
  };

  if (!originAsset || !destinationAsset || !amount || !recipient || !refundTo) {
    return withCors(
      request,
      apiError(
        "originAsset, destinationAsset, amount, recipient, and refundTo are required",
        400
      )
    );
  }

  if (swapType !== "EXACT_INPUT" && swapType !== "EXACT_OUTPUT") {
    return withCors(request, apiError("swapType must be EXACT_INPUT or EXACT_OUTPUT", 400));
  }

  try {
    // Always force dry-run on this public endpoint — real deposits require authenticated flows
    const quote = await getQuote({
      originAsset,
      destinationAsset,
      amount,
      recipient,
      refundTo,
      swapType,
      slippageTolerance,
      dryRun: true,
    });

    return withCors(request, withRateLimitHeaders(apiSuccess(quote), "checkout-quote", rl.remaining));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get quote";
    return withCors(request, apiError(message, 502));
  }
}
