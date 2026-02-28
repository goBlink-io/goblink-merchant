import * as React from "react";
import { getServiceClient } from "@/lib/service-client";
import { sendEmail } from "./client";
import { WelcomeEmail } from "./templates/welcome";
import { PaymentReceivedEmail } from "./templates/payment-received";
import { PaymentFailedEmail } from "./templates/payment-failed";
import { TicketReplyEmail } from "./templates/ticket-reply";
import { WithdrawalCompleteEmail } from "./templates/withdrawal-complete";
import { WeeklySummaryEmail } from "./templates/weekly-summary";

export type NotificationType =
  | "payment_received"
  | "payment_failed"
  | "ticket_reply"
  | "withdrawal_complete"
  | "weekly_summary"
  | "welcome";

interface NotificationPreferences {
  payment_received: boolean;
  payment_failed: boolean;
  ticket_reply: boolean;
  withdrawal_complete: boolean;
  weekly_summary: boolean;
}

interface TemplateResult {
  subject: string;
  react: React.ReactElement;
}

function buildTemplate(type: NotificationType, data: Record<string, unknown>): TemplateResult {
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
 * Central dispatch for merchant email notifications.
 * Checks notification preferences before sending (except "welcome" which always sends).
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

    // Build and send template
    const template = buildTemplate(type, {
      ...data,
      businessName: merchant.business_name,
    });

    await sendEmail({
      to: email,
      subject: template.subject,
      react: template.react,
    });
  } catch (err) {
    console.error("[email] sendMerchantEmail error:", err);
  }
}
