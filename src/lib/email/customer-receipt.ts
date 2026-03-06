import { sendEmail } from "./client";
import { getTemplate, renderTemplate, htmlEncode } from "./sender";
import { getExplorerTxUrl } from "@/lib/explorer";
import { truncateAddress, formatDate } from "@/lib/utils";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://merchant.goblink.io";

interface PaymentRecord {
  id: string;
  amount: number | string;
  currency: string;
  customer_email: string;
  customer_chain?: string | null;
  external_order_id?: string | null;
  merchant_id: string;
  confirmed_at?: string | null;
  created_at: string;
}

/**
 * Send a receipt email to the customer after payment confirmation.
 * Uses the 'customer_receipt' DB template. Fire-and-forget safe.
 */
export async function sendCustomerReceiptEmail(
  payment: PaymentRecord,
  fulfillmentTxHash: string | null
): Promise<void> {
  try {
    const { getServiceClient } = await import("@/lib/service-client");
    const supabase = getServiceClient();

    // Look up merchant name
    const { data: merchant } = await supabase
      .from("merchants")
      .select("business_name, settlement_chain")
      .eq("id", payment.merchant_id)
      .single();

    const chain = payment.customer_chain || merchant?.settlement_chain || "";
    const explorerUrl =
      chain && fulfillmentTxHash
        ? getExplorerTxUrl(chain, fulfillmentTxHash) || ""
        : "";
    const txHashShort = fulfillmentTxHash
      ? truncateAddress(fulfillmentTxHash, 10)
      : "";

    const receiptUrl = `${APP_URL}/pay/${payment.id}`;
    const date = payment.confirmed_at
      ? formatDate(payment.confirmed_at)
      : formatDate(payment.created_at);

    const variables: Record<string, string> = {
      amount: String(payment.amount),
      currency: payment.currency,
      merchant_name: merchant?.business_name || "Merchant",
      order_id: payment.external_order_id || "—",
      chain,
      explorer_url: explorerUrl,
      tx_hash_short: txHashShort,
      date,
      receipt_url: receiptUrl,
    };

    // Try DB template
    const dbTemplate = await getTemplate("customer_receipt");

    if (dbTemplate) {
      const renderedSubject = renderTemplate(dbTemplate.subject, variables);
      const renderedHtml = renderTemplate(dbTemplate.body_html, variables);
      const renderedText = renderTemplate(dbTemplate.body_text, variables);

      await sendEmail({
        to: payment.customer_email,
        subject: renderedSubject,
        html: renderedHtml,
        text: renderedText,
      });
    } else {
      // Minimal fallback
      const safeMerchantName = htmlEncode(merchant?.business_name || "the merchant");
      await sendEmail({
        to: payment.customer_email,
        subject: `Your payment receipt — ${payment.amount} ${payment.currency}`,
        html: `<p>Your payment of ${htmlEncode(String(payment.amount))} ${htmlEncode(payment.currency)} to ${safeMerchantName} has been confirmed.</p><p><a href="${htmlEncode(receiptUrl)}">View receipt</a></p><p style="color:#666;font-size:12px">Powered by goBlink</p>`,
        text: `Your payment of ${payment.amount} ${payment.currency} has been confirmed. View receipt: ${receiptUrl}`,
      });
    }

    console.log("[email] Customer receipt sent:", payment.customer_email, "payment:", payment.id);
  } catch (err) {
    console.error("[email] sendCustomerReceiptEmail error:", err);
  }
}
