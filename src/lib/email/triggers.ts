import { getServiceClient } from "@/lib/service-client";
import { getExplorerTxUrl } from "@/lib/explorer";
import { sendMerchantEmail } from "./sender";

/**
 * Send welcome email after merchant signup.
 */
export async function sendWelcomeEmail(merchantId: string): Promise<void> {
  await sendMerchantEmail(merchantId, "welcome", {});
}

/**
 * Notify merchant that a payment was confirmed.
 * Call after payment status changes to "confirmed".
 */
export async function notifyPaymentReceived(paymentId: string): Promise<void> {
  const supabase = getServiceClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("id, merchant_id, amount, currency, customer_wallet, token, chain, order_id, tx_hash, confirmed_at")
    .eq("id", paymentId)
    .single();

  if (!payment) {
    console.error("[email] Payment not found:", paymentId);
    return;
  }

  await sendMerchantEmail(payment.merchant_id, "payment_received", {
    amount: payment.amount,
    currency: payment.currency,
    customerWallet: payment.customer_wallet || "",
    token: payment.token || "Unknown",
    chain: payment.chain || "Unknown",
    orderId: payment.order_id,
    txHash: payment.tx_hash || "",
    explorerUrl: payment.chain && payment.tx_hash
      ? getExplorerTxUrl(payment.chain, payment.tx_hash)
      : null,
    paymentId: payment.id,
    time: payment.confirmed_at
      ? new Date(payment.confirmed_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
      : new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
  });
}

/**
 * Notify merchant that a payment failed or expired.
 * Call after payment status changes to "failed" or "expired".
 */
export async function notifyPaymentFailed(paymentId: string): Promise<void> {
  const supabase = getServiceClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("id, merchant_id, amount, currency, order_id, status, updated_at")
    .eq("id", paymentId)
    .single();

  if (!payment) {
    console.error("[email] Payment not found:", paymentId);
    return;
  }

  const reasonMap: Record<string, string> = {
    expired: "Payment expired — customer did not complete payment in time",
    failed: "Payment failed — transaction error on chain",
    underpaid: "Underpaid — received amount was less than expected",
  };

  await sendMerchantEmail(payment.merchant_id, "payment_failed", {
    amount: payment.amount,
    currency: payment.currency,
    orderId: payment.order_id,
    reason: reasonMap[payment.status] || `Payment ${payment.status}`,
    paymentId: payment.id,
    time: new Date(payment.updated_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
  });
}

/**
 * Notify merchant that an admin replied to their support ticket.
 * Call after an admin sends a message on a ticket.
 */
export async function notifyTicketReply(ticketId: string, messageId: string): Promise<void> {
  const supabase = getServiceClient();

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, merchant_id, subject, status")
    .eq("id", ticketId)
    .single();

  if (!ticket) {
    console.error("[email] Ticket not found:", ticketId);
    return;
  }

  const { data: message } = await supabase
    .from("ticket_messages")
    .select("body")
    .eq("id", messageId)
    .single();

  if (!message) {
    console.error("[email] Message not found:", messageId);
    return;
  }

  const preview = message.body.length > 200
    ? message.body.slice(0, 200) + "..."
    : message.body;

  await sendMerchantEmail(ticket.merchant_id, "ticket_reply", {
    ticketSubject: ticket.subject,
    ticketStatus: ticket.status,
    ticketId: ticket.id,
    messagePreview: preview,
  });
}

/**
 * Notify merchant that a withdrawal was completed.
 * Call after withdrawal status changes to "completed".
 */
export async function notifyWithdrawalComplete(withdrawalId: string): Promise<void> {
  const supabase = getServiceClient();

  const { data: withdrawal } = await supabase
    .from("withdrawals")
    .select("id, merchant_id, amount, currency, destination_address, chain, token, tx_hash, completed_at")
    .eq("id", withdrawalId)
    .single();

  if (!withdrawal) {
    console.error("[email] Withdrawal not found:", withdrawalId);
    return;
  }

  await sendMerchantEmail(withdrawal.merchant_id, "withdrawal_complete", {
    amount: withdrawal.amount,
    currency: withdrawal.currency,
    destinationAddress: withdrawal.destination_address || "",
    chain: withdrawal.chain || "Unknown",
    token: withdrawal.token || "Unknown",
    txHash: withdrawal.tx_hash || "",
    explorerUrl: withdrawal.chain && withdrawal.tx_hash
      ? getExplorerTxUrl(withdrawal.chain, withdrawal.tx_hash)
      : null,
    time: withdrawal.completed_at
      ? new Date(withdrawal.completed_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
      : new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
  });
}
