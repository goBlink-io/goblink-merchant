import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/service-client";
import { getExecutionStatus } from "@/lib/oneclick";
import { dispatchWebhooks } from "@/lib/webhooks";
import { apiError, apiSuccess } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";

const FEE_RATE = 0.01; // 1%

// GET /api/cron/settle-payments — Vercel Cron endpoint.
// Settles processing payments via 1Click and expires stale pending payments.
export async function GET(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return apiError("CRON_SECRET not configured", 500);
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return apiError("Unauthorized", 401);
  }

  const supabase = getServiceClient();
  const results = { settled: 0, failed: 0, refunded: 0, expired: 0, skipped: 0, errors: 0 };

  // --- 1. Settle processing payments ---
  const { data: processingPayments, error: fetchErr } = await supabase
    .from("payments")
    .select("*")
    .eq("status", "processing")
    .not("deposit_address", "is", null);

  if (fetchErr) {
    console.error("[settle-payments] Failed to fetch processing payments:", fetchErr.message);
    return apiError("Failed to fetch payments", 500);
  }

  for (const payment of processingPayments ?? []) {
    try {
      const execution = await getExecutionStatus(payment.deposit_address);
      const status =
        typeof execution === "object" && execution !== null
          ? (execution as Record<string, unknown>).status
          : undefined;

      if (status === "SUCCESS") {
        const fulfillmentTxHash =
          (execution as Record<string, unknown>).fulfillmentTxHash as
            | string
            | undefined;

        const amount = Number(payment.amount);
        const feeAmount = Math.round(amount * FEE_RATE * 100) / 100;
        const netAmount = Math.round((amount - feeAmount) * 100) / 100;

        const { error: updateErr } = await supabase
          .from("payments")
          .update({
            status: "confirmed",
            fulfillment_tx_hash: fulfillmentTxHash ?? null,
            confirmed_at: new Date().toISOString(),
            fee_amount: feeAmount,
            fee_currency: payment.currency,
            net_amount: netAmount,
          })
          .eq("id", payment.id)
          .eq("status", "processing"); // Idempotency guard

        if (updateErr) {
          console.error(`[settle-payments] Failed to confirm ${payment.id}:`, updateErr.message);
          results.errors++;
          continue;
        }

        dispatchWebhooks(payment.merchant_id, {
          event: "payment.confirmed",
          paymentId: payment.id,
          merchantId: payment.merchant_id,
          timestamp: new Date().toISOString(),
          data: {
            amount: payment.amount,
            currency: payment.currency,
            feeAmount,
            netAmount,
            status: "confirmed",
            fulfillmentTxHash: fulfillmentTxHash ?? null,
            sendTxHash: payment.send_tx_hash,
          },
        });

        logAudit({
          merchantId: payment.merchant_id,
          actor: "system",
          action: "payment.confirmed",
          resourceType: "payment",
          resourceId: payment.id,
          metadata: { feeAmount, netAmount, fulfillmentTxHash: fulfillmentTxHash ?? null },
        });

        results.settled++;
      } else if (status === "FAILED") {
        const { error: updateErr } = await supabase
          .from("payments")
          .update({ status: "failed" })
          .eq("id", payment.id)
          .eq("status", "processing");

        if (updateErr) {
          results.errors++;
          continue;
        }

        dispatchWebhooks(payment.merchant_id, {
          event: "payment.failed",
          paymentId: payment.id,
          merchantId: payment.merchant_id,
          timestamp: new Date().toISOString(),
          data: {
            amount: payment.amount,
            currency: payment.currency,
            status: "failed",
            sendTxHash: payment.send_tx_hash,
          },
        });

        logAudit({
          merchantId: payment.merchant_id,
          actor: "system",
          action: "payment.failed",
          resourceType: "payment",
          resourceId: payment.id,
        });

        results.failed++;
      } else if (status === "REFUNDED") {
        const { error: updateErr } = await supabase
          .from("payments")
          .update({ status: "refunded" })
          .eq("id", payment.id)
          .eq("status", "processing");

        if (updateErr) {
          results.errors++;
          continue;
        }

        dispatchWebhooks(payment.merchant_id, {
          event: "payment.refunded",
          paymentId: payment.id,
          merchantId: payment.merchant_id,
          timestamp: new Date().toISOString(),
          data: {
            amount: payment.amount,
            currency: payment.currency,
            status: "refunded",
            sendTxHash: payment.send_tx_hash,
          },
        });

        logAudit({
          merchantId: payment.merchant_id,
          actor: "system",
          action: "payment.refunded",
          resourceType: "payment",
          resourceId: payment.id,
        });

        results.refunded++;
      } else {
        // PENDING_DEPOSIT, KNOWN_DEPOSIT_TX, PROCESSING, INCOMPLETE_DEPOSIT — still in progress
        results.skipped++;
      }
    } catch (err) {
      console.error(
        `[settle-payments] Error checking ${payment.id}:`,
        err instanceof Error ? err.message : err
      );
      results.errors++;
    }
  }

  // --- 2. Expire stale pending payments ---
  const { data: expiredPayments, error: expireErr } = await supabase
    .from("payments")
    .select("id, merchant_id, amount, currency")
    .eq("status", "pending")
    .not("expires_at", "is", null)
    .lt("expires_at", new Date().toISOString());

  if (!expireErr && expiredPayments) {
    for (const payment of expiredPayments) {
      const { error: updateErr } = await supabase
        .from("payments")
        .update({ status: "expired" })
        .eq("id", payment.id)
        .eq("status", "pending"); // Idempotency guard

      if (updateErr) {
        results.errors++;
        continue;
      }

      dispatchWebhooks(payment.merchant_id, {
        event: "payment.expired",
        paymentId: payment.id,
        merchantId: payment.merchant_id,
        timestamp: new Date().toISOString(),
        data: {
          amount: payment.amount,
          currency: payment.currency,
          status: "expired",
        },
      });

      results.expired++;
    }
  }

  console.log("[settle-payments] Run complete:", results);

  return apiSuccess({ ok: true, results });
}
