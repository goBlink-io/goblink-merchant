import { apiError, apiSuccess } from "@/lib/api-response";
import { getTokens } from "@/lib/oneclick";

// GET /api/checkout/tokens — Public. Proxy to 1Click getTokens().
export async function GET() {
  try {
    const tokens = await getTokens();
    return apiSuccess(tokens);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch tokens";
    return apiError(message, 502);
  }
}
