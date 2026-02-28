import * as React from "react";
import { getServiceClient } from "@/lib/service-client";
import { sendEmail } from "./client";
import { WelcomeEmail } from "./templates/welcome";
import { PaymentReceivedEmail } from "./templates/payment-received";
import { PaymentFailedEmail } from "./templates/payment-failed";
import { TicketReplyEmail } from "./templates/ticket-reply";
import { WithdrawalCompleteEmail } from "./templates/withdrawal-complete";
import { WeeklySummaryEmail } from "./templates/weekly-summary";
import { RefundIssuedEmail } from "./templates/refund-issued";

export type NotificationType =
  | "payment_received"
  | "payment_failed"
  | "refund_issued"
  | "ticket_reply"
  | "withdrawal_complete"
  | "weekly_summary"
  | "welcome";

interface NotificationPreferences {
  payment_received: boolean;
  payment_failed: boolean;
  refund_issued: boolean;
  ticket_reply: boolean;
  withdrawal_complete: boolean;
  weekly_summary: boolean;
}

export interface EmailTemplate {
  id: string;
  type: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  variables: Array<{ name: string; description: string }>;
  is_active: boolean;
  updated_at: string;
  created_at: string;
}

// Simple in-process cache for DB templates (5 min TTL)
const templateCache = new Map<string, { template: EmailTemplate; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Fetch a template from the email_templates table.
 * Cached for 5 minutes per type. Returns null if not found.
 */
export async function getTemplate(type: string): Promise<EmailTemplate | null> {
  const cached = templateCache.get(type);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.template;
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("type", type)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      console.warn("[email] DB template not found for type:", type);
      return null;
    }

    const template = data as EmailTemplate;
    templateCache.set(type, { template, fetchedAt: Date.now() });
    return template;
  } catch (err) {
    console.error("[email] Failed to fetch template:", type, err);
    return null;
  }
}

/**
 * Replace all {{variable}} placeholders with actual values.
 * Strips any unreplaced {{variables}}.
 */
export function renderTemplate(html: string, variables: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  // Strip unreplaced placeholders
  result = result.replace(/\{\{[a-zA-Z_]+\}\}/g, "");
  return result;
}

/** Clear the template cache (useful after admin edits) */
export function clearTemplateCache(): void {
  templateCache.clear();
}

interface ReactTemplateResult {
  subject: string;
  react: React.ReactElement;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://merchant.goblink.io";

/**
 * Build a React-based template as fallback when DB template is unavailable.
 */
function buildFallbackTemplate(type: NotificationType, data: Record<string, unknown>): ReactTemplateResult {
  switch (type) {
    case "welcome":
      return {
        subject: "Welcome to goBlink Merchant!",
        react: React.createElement(WelcomeEmail, {
          businessName: data.businessName as string,
        }),
      };

    case "payment_received":
      return {
        subject: `Payment received: $${data.amount} ${data.currency}`,
        react: React.createElement(PaymentReceivedEmail, {
          amount: data.amount as string,
          currency: data.currency as string,
          customerWallet: data.customerWallet as string,
          token: data.token as string,
          chain: data.chain as string,
          orderId: (data.orderId as string) || null,
          txHash: data.txHash as string,
          explorerUrl: (data.explorerUrl as string) || null,
          paymentId: data.paymentId as string,
          time: data.time as string,
        }),
      };

    case "payment_failed":
      return {
        subject: `Payment failed: $${data.amount} ${data.currency}`,
        react: React.createElement(PaymentFailedEmail, {
          amount: data.amount as string,
          currency: data.currency as string,
          orderId: (data.orderId as string) || null,
          reason: data.reason as string,
          paymentId: data.paymentId as string,
          time: data.time as string,
        }),
      };

    case "refund_issued":
      return {
        subject: `Refund issued: $${data.amount} ${data.currency}`,
        react: React.createElement(RefundIssuedEmail, {
          amount: data.amount as string,
          currency: data.currency as string,
          originalAmount: data.originalAmount as string,
          reason: (data.reason as string) || null,
          paymentId: data.paymentId as string,
          refundId: data.refundId as string,
          time: data.time as string,
        }),
      };

    case "ticket_reply":
      return {
        subject: `New reply on your support ticket: ${data.ticketSubject}`,
        react: React.createElement(TicketReplyEmail, {
          ticketSubject: data.ticketSubject as string,
          ticketStatus: data.ticketStatus as string,
          ticketId: data.ticketId as string,
          messagePreview: data.messagePreview as string,
        }),
      };

    case "withdrawal_complete":
      return {
        subject: `Withdrawal complete: $${data.amount} ${data.currency}`,
        react: React.createElement(WithdrawalCompleteEmail, {
          amount: data.amount as string,
          currency: data.currency as string,
          destinationAddress: data.destinationAddress as string,
          chain: data.chain as string,
          token: data.token as string,
          txHash: data.txHash as string,
          explorerUrl: (data.explorerUrl as string) || null,
          time: data.time as string,
        }),
      };

    case "weekly_summary":
      return {
        subject: `Your weekly goBlink summary — $${data.totalRevenue} earned`,
        react: React.createElement(WeeklySummaryEmail, {
          totalRevenue: data.totalRevenue as string,
          currency: data.currency as string,
          paymentCount: data.paymentCount as number,
          topToken: data.topToken as string,
          topChain: data.topChain as string,
          comparedToLastWeek: data.comparedToLastWeek as number,
          openTickets: data.openTickets as number,
        }),
      };
  }
}

/**
 * Map from NotificationType + data to the DB template variable names.
 */
function mapToTemplateVariables(type: NotificationType, data: Record<string, unknown>): Record<string, string> {
  const businessName = (data.businessName as string) || "";
  const dashboardUrl = APP_URL + "/dashboard";

  switch (type) {
    case "welcome":
      return {
        business_name: businessName,
        dashboard_url: dashboardUrl,
      };

    case "payment_received":
      return {
        business_name: businessName,
        amount: String(data.amount || ""),
        currency: String(data.currency || ""),
        crypto_amount: String(data.amount || ""),
        crypto_token: String(data.token || ""),
        crypto_chain: String(data.chain || ""),
        customer_wallet: String(data.customerWallet || ""),
        order_id: String(data.orderId || ""),
        tx_hash: String(data.txHash || ""),
        payment_url: `${dashboardUrl}/payments/${data.paymentId || ""}`,
        dashboard_url: dashboardUrl,
      };

    case "payment_failed":
      return {
        business_name: businessName,
        amount: String(data.amount || ""),
        currency: String(data.currency || ""),
        order_id: String(data.orderId || ""),
        reason: String(data.reason || ""),
        payment_url: `${dashboardUrl}/payments/${data.paymentId || ""}`,
        dashboard_url: dashboardUrl,
      };

    case "refund_issued":
      return {
        business_name: businessName,
        amount: String(data.amount || ""),
        currency: String(data.currency || ""),
        original_amount: String(data.originalAmount || ""),
        reason: String(data.reason || ""),
        refund_id: String(data.refundId || ""),
        payment_url: `${dashboardUrl}/payments/${data.paymentId || ""}`,
        dashboard_url: dashboardUrl,
      };

    case "ticket_reply":
      return {
        business_name: businessName,
        ticket_subject: String(data.ticketSubject || ""),
        message_preview: String(data.messagePreview || ""),
        ticket_status: String(data.ticketStatus || ""),
        ticket_url: `${dashboardUrl}/support/${data.ticketId || ""}`,
        dashboard_url: dashboardUrl,
      };

    case "withdrawal_complete":
      return {
        business_name: businessName,
        amount: String(data.amount || ""),
        currency: String(data.currency || ""),
        destination_address: String(data.destinationAddress || ""),
        destination_chain: String(data.chain || ""),
        destination_token: String(data.token || ""),
        tx_hash: String(data.txHash || ""),
        wallet_url: `${dashboardUrl}/wallet`,
        dashboard_url: dashboardUrl,
      };

    case "weekly_summary": {
      const compared = data.comparedToLastWeek as number;
      const isUp = compared >= 0;
      return {
        business_name: businessName,
        total_revenue: String(data.totalRevenue || "0"),
        payment_count: String(data.paymentCount || "0"),
        top_token: String(data.topToken || "—"),
        top_chain: String(data.topChain || "—"),
        trend_percent: String(Math.abs(compared || 0)),
        trend_direction: isUp ? "↑" : "↓",
        trend_color: isUp ? "#4ade80" : "#f87171",
        open_tickets: String(data.openTickets || "0"),
        dashboard_url: dashboardUrl,
      };
    }
  }
}

/**
 * Central dispatch for merchant email notifications.
 * Checks notification preferences before sending (except "welcome" which always sends).
 * Tries DB template first, falls back to hardcoded React templates.
 */
export async function sendMerchantEmail(
  merchantId: string,
  type: NotificationType,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = getServiceClient();

    // Look up merchant
    const { data: merchant, error } = await supabase
      .from("merchants")
      .select("id, business_name, notification_preferences")
      .eq("id", merchantId)
      .single();

    if (error || !merchant) {
      console.error("[email] Merchant not found:", merchantId, error);
      return;
    }

    // Get merchant's email from auth.users via user_id
    const { data: merchantFull } = await supabase
      .from("merchants")
      .select("user_id")
      .eq("id", merchantId)
      .single();

    if (!merchantFull) return;

    const { data: userData } = await supabase.auth.admin.getUserById(merchantFull.user_id);
    const email = userData?.user?.email;

    if (!email) {
      console.error("[email] No email found for merchant:", merchantId);
      return;
    }

    // Check notification preferences (welcome always sends)
    if (type !== "welcome") {
      const prefs = (merchant.notification_preferences as NotificationPreferences) || {};
      const prefKey = type as keyof NotificationPreferences;
      if (prefs[prefKey] === false) {
        console.log("[email] Notification disabled for type:", type, "merchant:", merchantId);
        return;
      }
    }

    // Enrich data with business name
    const enrichedData = { ...data, businessName: merchant.business_name };

    // Try DB template first
    const dbTemplate = await getTemplate(type);

    if (dbTemplate) {
      const variables = mapToTemplateVariables(type, enrichedData);
      const renderedSubject = renderTemplate(dbTemplate.subject, variables);
      const renderedHtml = renderTemplate(dbTemplate.body_html, variables);
      const renderedText = renderTemplate(dbTemplate.body_text, variables);

      await sendEmail({
        to: email,
        subject: renderedSubject,
        html: renderedHtml,
        text: renderedText,
      });
    } else {
      // Fallback to hardcoded React templates
      const template = buildFallbackTemplate(type, enrichedData);
      await sendEmail({
        to: email,
        subject: template.subject,
        react: template.react,
      });
    }
  } catch (err) {
    console.error("[email] sendMerchantEmail error:", err);
  }
}
