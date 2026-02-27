import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getQuote, submitDeposit } from "@/lib/oneclick";

// POST /api/checkout/quote — Public. Get a swap quote from 1Click.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
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
    return apiError(
      "originAsset, destinationAsset, amount, recipient, and refundTo are required",
      400
    );
  }

  if (swapType !== "EXACT_INPUT" && swapType !== "EXACT_OUTPUT") {
    return apiError("swapType must be EXACT_INPUT or EXACT_OUTPUT", 400);
  }

  try {
    const isDry = dryRun !== false;
    const quote = isDry
      ? await getQuote({
          originAsset,
          destinationAsset,
          amount,
          recipient,
          refundTo,
          swapType,
          slippageTolerance,
          dryRun: true,
        })
      : await submitDeposit({
          originAsset,
          destinationAsset,
          amount,
          recipient,
          refundTo,
          swapType,
          slippageTolerance,
        });

    return apiSuccess(quote);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get quote";
    return apiError(message, 502);
  }
}
