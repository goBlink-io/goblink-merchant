import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { dispatchWebhooks } from "@/lib/webhooks";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/checkout/[id]/complete — Mark payment as processing (customer sent tx).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { sendTxHash, depositAddress, payerAddress, payerChain } = body as {
    sendTxHash: string;
    depositAddress: string;
    payerAddress: string;
    payerChain: string;
  };

  if (!sendTxHash || !payerAddress || !payerChain) {
    return apiError("sendTxHash, payerAddress, and payerChain are required", 400);
  }

  const supabase = getServiceClient();

  // Verify payment exists and is pending
  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !payment) {
    return apiError("Payment not found", 404);
  }

  if (payment.status !== "pending") {
    return apiError(`Payment is ${payment.status}, expected pending`, 409);
  }

  const { data: updated, error } = await supabase
    .from("payments")
    .update({
      status: "processing",
      customer_wallet: payerAddress,
      customer_chain: payerChain,
      send_tx_hash: sendTxHash,
      deposit_address: depositAddress || payment.deposit_address,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !updated) {
    return apiError("Failed to update payment", 500);
  }

  // Dispatch webhook
  dispatchWebhooks(payment.merchant_id, {
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
    },
  });

  return apiSuccess({ status: "processing", id });
}

// PATCH /api/checkout/[id]/complete — Mark payment as confirmed (fulfillment received).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    .select("*")
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
    .select("*")
    .single();

  if (error || !updated) {
    return apiError("Failed to update payment", 500);
  }

  // Dispatch webhook
  const event = outcome === "confirmed" ? "payment.confirmed" : "payment.failed";
  dispatchWebhooks(payment.merchant_id, {
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

  return apiSuccess({ status: outcome, id });
}
