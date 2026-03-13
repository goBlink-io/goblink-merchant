import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { dispatchWebhooks } from "@/lib/webhooks";
import { logAudit } from "@/lib/audit";
import { checkRateLimit, withRateLimitHeaders } from "@/lib/rate-limit";
import { withCors, handleCorsOptions } from "@/lib/cors";
import { timingSafeCompare } from "@/lib/timing-safe";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Minimal validation: non-empty string that could be a crypto address (8+ hex-ish chars)
function isPlausibleAddress(addr: unknown): addr is string {
  return typeof addr === "string" && addr.trim().length >= 8;
}

// Validate transaction hash format based on chain
function isTxHash(hash: string, chain: string): boolean {
  const lc = chain.toLowerCase();
  if (lc === "solana") {
    // Solana tx signatures are base58-encoded, typically 87-88 chars
    return /^[1-9A-HJ-NP-Za-km-z]{64,128}$/.test(hash);
  }
  // EVM chains (Ethereum, Polygon, Arbitrum, Base, etc): 0x-prefixed 64 hex chars
  return /^0x[0-9a-fA-F]{64}$/.test(hash);
}

function validateCustomFields(fields: unknown): string | null {
  if (fields === undefined || fields === null) return null;
  if (typeof fields !== "object" || Array.isArray(fields)) {
    return "customFields must be an object";
  }
  const entries = Object.entries(fields as Record<string, unknown>);
  if (entries.length > 10) {
    return "customFields cannot have more than 10 keys";
  }
  for (const [key, value] of entries) {
    if (typeof key !== "string" || typeof value !== "string") {
      return "customFields keys and values must be strings";
    }
    if (value.length > 256) {
      return "customFields values cannot exceed 256 characters";
    }
  }
  return null;
}

// OPTIONS — CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// POST /api/checkout/[id]/complete — Mark payment as processing (customer sent tx).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit
  const rl = await checkRateLimit(request, "checkout-complete", undefined, true);
  if (!rl.allowed) return withCors(request, rl.response!);

  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return withCors(request, apiError("Invalid payment ID", 400));
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return withCors(request, apiError("Invalid JSON body", 400));
  }

  const { sendTxHash, depositAddress, payerAddress, payerChain, customerEmail, customFields } = body as {
    sendTxHash: string;
    depositAddress: string;
    payerAddress: string;
    payerChain: string;
    customerEmail?: string;
    customFields?: Record<string, string>;
  };

  if (!sendTxHash || !payerAddress || !payerChain) {
    return withCors(request, apiError("sendTxHash, payerAddress, and payerChain are required", 400));
  }

  // Validate txHash format
  if (!isTxHash(sendTxHash, payerChain)) {
    return withCors(request, apiError("sendTxHash is not a valid transaction hash for the specified chain", 400));
  }

  // Validate customFields
  const cfError = validateCustomFields(customFields);
  if (cfError) {
    return withCors(request, apiError(cfError, 400));
  }

  // Require a valid-looking deposit address
  if (!isPlausibleAddress(depositAddress)) {
    return withCors(request, apiError("depositAddress is required and must be a valid address", 400));
  }

  const supabase = getServiceClient();

  // Verify payment exists and is pending
  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("id, status, deposit_address, merchant_id, amount, currency, metadata")
    .eq("id", id)
    .single();

  if (fetchError || !payment) {
    return withCors(request, apiError("Payment not found", 404));
  }

  if (payment.status !== "pending") {
    return withCors(request, apiError(`Payment is ${payment.status}, expected pending`, 409));
  }

  // If the payment already has a deposit_address set, the caller must match it
  if (payment.deposit_address && payment.deposit_address !== depositAddress) {
    return withCors(request, apiError("depositAddress does not match the existing deposit address for this payment", 400));
  }

  // P2-E: Store customer email if provided (for receipt delivery)
  const updatePayload: Record<string, unknown> = {
    status: "processing",
    customer_wallet: payerAddress,
    customer_chain: payerChain,
    send_tx_hash: sendTxHash,
    deposit_address: depositAddress,
  };

  if (customerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    updatePayload.customer_email = customerEmail;
  }

  // HXF 3.4: Store custom field values in payment metadata
  if (customFields && typeof customFields === "object" && Object.keys(customFields).length > 0) {
    const existingMetadata = (payment.metadata as Record<string, unknown>) ?? {};
    updatePayload.metadata = { ...existingMetadata, custom_fields: customFields };
  }

  const { data: updated, error } = await supabase
    .from("payments")
    .update(updatePayload)
    .eq("id", id)
    .eq("status", "pending") // Idempotency guard
    .select("id, amount, currency, status")
    .single();

  if (error || !updated) {
    return withCors(request, apiError("Failed to update payment", 500));
  }

  // Dispatch webhook — must await in serverless to ensure delivery
  await dispatchWebhooks(payment.merchant_id, {
    event: "payment.processing",
    paymentId: id,
    merchantId: payment.merchant_id,
    timestamp: new Date().toISOString(),
    data: {
      amount: updated.amount,
      currency: updated.currency,
      status: "processing",
      sendTxHash,
      payerAddress,
      payerChain,
      ...(customFields && Object.keys(customFields).length > 0 ? { custom_fields: customFields } : {}),
    },
  });

  await logAudit({
    merchantId: payment.merchant_id,
    actor: "checkout",
    action: "payment.processing",
    resourceType: "payment",
    resourceId: id,
    metadata: { payerAddress, payerChain },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return withCors(request, withRateLimitHeaders(apiSuccess({ status: "processing", id }), "checkout-complete", rl.remaining));
}

// PATCH /api/checkout/[id]/complete — Confirm or fail a payment.
// Only callable by the cron settler (requires CRON_SECRET).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify CRON_SECRET — only the settle-payments cron may confirm/fail payments
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return apiError("CRON_SECRET not configured", 500);
  }

  if (!authHeader || !timingSafeCompare(authHeader, `Bearer ${cronSecret}`)) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return apiError("Invalid payment ID", 400);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { fulfillmentTxHash, outcome } = body as {
    fulfillmentTxHash?: string;
    outcome: "confirmed" | "failed";
  };

  if (!outcome || (outcome !== "confirmed" && outcome !== "failed")) {
    return apiError("outcome must be 'confirmed' or 'failed'", 400);
  }

  const supabase = getServiceClient();

  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("id, status, merchant_id, amount, currency")
    .eq("id", id)
    .single();

  if (fetchError || !payment) {
    return apiError("Payment not found", 404);
  }

  if (payment.status !== "processing") {
    return apiError(`Payment is ${payment.status}, expected processing`, 409);
  }

  const updateData: Record<string, unknown> = {
    status: outcome,
  };

  if (outcome === "confirmed") {
    updateData.confirmed_at = new Date().toISOString();
    if (fulfillmentTxHash) {
      updateData.fulfillment_tx_hash = fulfillmentTxHash;
    }
  }

  const { data: updated, error } = await supabase
    .from("payments")
    .update(updateData)
    .eq("id", id)
    .eq("status", "processing") // Idempotency guard
    .select("id, amount, currency, status")
    .single();

  if (error || !updated) {
    return apiError("Failed to update payment", 500);
  }

  // Dispatch webhook — must await in serverless to ensure delivery
  const event = outcome === "confirmed" ? "payment.confirmed" : "payment.failed";
  await dispatchWebhooks(payment.merchant_id, {
    event,
    paymentId: id,
    merchantId: payment.merchant_id,
    timestamp: new Date().toISOString(),
    data: {
      amount: updated.amount,
      currency: updated.currency,
      status: outcome,
      fulfillmentTxHash: fulfillmentTxHash || null,
    },
  });

  await logAudit({
    merchantId: payment.merchant_id,
    actor: "system",
    action: `payment.${outcome}`,
    resourceType: "payment",
    resourceId: id,
    metadata: { fulfillmentTxHash: fulfillmentTxHash ?? null },
  });

  return apiSuccess({ status: outcome, id });
}
