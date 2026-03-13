import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/service-client";
import { checkSettlementStatus } from "@/lib/settlement";
import { dispatchWebhooks } from "@/lib/webhooks";
import { apiError, apiSuccess } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { insertNotification } from "@/lib/notifications";
import { timingSafeCompare } from "@/lib/timing-safe";

const FEE_BPS = 100; // 1% = 100 basis points

// GET /api/cron/settlement-status — Poll 1Click for settlement updates.
// Protected by CRON_SECRET. Checks payments with settlement_status in (pending, processing).
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return apiError("CRON_SECRET not configured", 500);
  }

  if (!authHeader || !timingSafeCompare(authHeader, `Bearer ${cronSecret}`)) {
    return apiError("Unauthorized", 401);
  }

  const supabase = getServiceClient();
  const results = { settled: 0, failed: 0, refunded: 0, processing: 0, errors: 0 };

  // Fetch payments with active settlements
  const { data: payments, error: fetchErr } = await supabase
    .from("payments")
    .select("*")
    .in("settlement_status", ["pending", "processing"])
    .not("deposit_address", "is", null)
    .limit(100); // Bound query to prevent serverless timeout

  if (fetchErr) {
    console.error("[settlement-status] Failed to fetch payments:", fetchErr.message);
    return apiError("Failed to fetch payments", 500);
  }

  for (const payment of payments ?? []) {
    try {
      const result = await checkSettlementStatus(payment.deposit_address);

      if (result.status === "SUCCESS") {
        // Integer arithmetic: work in cents to avoid float precision issues (M8)
        // Must match settle-payments cron exactly
        const amountCents = Math.round(Number(payment.amount) * 100);
        const feeCents = Math.floor(amountCents * FEE_BPS / 10000);
        const netCents = amountCents - feeCents;
        const feeAmount = feeCents / 100;
        const netAmount = netCents / 100;
        const now = new Date().toISOString();

        const { error: updateErr } = await supabase
          .from("payments")
          .update({
            status: "confirmed",
            settlement_status: "settled",
            fulfillment_tx_hash: result.fulfillmentTxHash ?? null,
            confirmed_at: now,
            settled_at: now,
            fee_amount: feeAmount,
            fee_currency: payment.currency,
            net_amount: netAmount,
          })
          .eq("id", payment.id)
          .in("settlement_status", ["pending", "processing"]);

        if (updateErr) {
          console.error(`[settlement-status] Failed to settle ${payment.id}:`, updateErr.message);
          results.errors++;
          continue;
        }

        await dispatchWebhooks(payment.merchant_id, {
          event: "payment.confirmed",
          paymentId: payment.id,
          merchantId: payment.merchant_id,
          timestamp: now,
          data: {
            amount: payment.amount,
            currency: payment.currency,
            feeAmount,
            netAmount,
            status: "confirmed",
            fulfillmentTxHash: result.fulfillmentTxHash ?? null,
            settlementChain: payment.settlement_chain,
            settlementToken: payment.settlement_token,
          },
        });

        await insertNotification(
          payment.merchant_id,
          "payment_received",
          "Payment settled",
          `${payment.currency} ${payment.amount} payment settled via 1Click.`,
          `/dashboard/payments/${payment.id}`
        );

        await logAudit({
          merchantId: payment.merchant_id,
          actor: "system",
          action: "settlement.confirmed",
          resourceType: "payment",
          resourceId: payment.id,
          metadata: {
            feeAmount,
            netAmount,
            fulfillmentTxHash: result.fulfillmentTxHash ?? null,
          },
        });

        results.settled++;
      } else if (result.status === "FAILED") {
        await supabase
          .from("payments")
          .update({ settlement_status: "failed" })
          .eq("id", payment.id);

        await dispatchWebhooks(payment.merchant_id, {
          event: "payment.failed",
          paymentId: payment.id,
          merchantId: payment.merchant_id,
          timestamp: new Date().toISOString(),
          data: {
            amount: payment.amount,
            currency: payment.currency,
            status: "failed",
          },
        });

        await insertNotification(
          payment.merchant_id,
          "payment_failed",
          "Settlement failed",
          `${payment.currency} ${payment.amount} settlement failed.`,
          `/dashboard/payments/${payment.id}`
        );

        await logAudit({
          merchantId: payment.merchant_id,
          actor: "system",
          action: "settlement.failed",
          resourceType: "payment",
          resourceId: payment.id,
        });

        results.failed++;
      } else if (result.status === "REFUNDED") {
        await supabase
          .from("payments")
          .update({
            status: "refunded",
            settlement_status: "failed",
          })
          .eq("id", payment.id);

        await dispatchWebhooks(payment.merchant_id, {
          event: "payment.refunded",
          paymentId: payment.id,
          merchantId: payment.merchant_id,
          timestamp: new Date().toISOString(),
          data: {
            amount: payment.amount,
            currency: payment.currency,
            status: "refunded",
          },
        });

        await logAudit({
          merchantId: payment.merchant_id,
          actor: "system",
          action: "settlement.refunded",
          resourceType: "payment",
          resourceId: payment.id,
        });

        results.refunded++;
      } else if (
        result.status === "KNOWN_DEPOSIT_TX" ||
        result.status === "PROCESSING"
      ) {
        // Upgrade from pending → processing if we detect a deposit
        if (payment.settlement_status === "pending") {
          await supabase
            .from("payments")
            .update({ settlement_status: "processing" })
            .eq("id", payment.id);
        }
        results.processing++;
      }
      // PENDING_DEPOSIT, INCOMPLETE_DEPOSIT — no action needed, still waiting
    } catch (err) {
      console.error(
        `[settlement-status] Error checking ${payment.id}:`,
        err instanceof Error ? err.message : err
      );
      results.errors++;
    }
  }

  console.log("[settlement-status] Run complete:", results);

  return apiSuccess({ ok: true, results });
}
