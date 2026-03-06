import { getServiceClient } from "@/lib/service-client";
import type { EmailTemplate } from "@/lib/email/sender";

export async function getAllTemplates(): Promise<EmailTemplate[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin] Failed to fetch templates:", error);
    return [];
  }

  return (data as EmailTemplate[]) || [];
}

export async function getTemplateById(id: string): Promise<EmailTemplate | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as EmailTemplate;
}

export async function updateTemplate(
  id: string,
  updates: {
    subject?: string;
    body_html?: string;
    body_text?: string;
    is_active?: boolean;
  }
): Promise<EmailTemplate | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("email_templates")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[admin] Failed to update template:", error);
    return null;
  }

  return data as EmailTemplate;
}

export async function getTemplateByType(type: string): Promise<EmailTemplate | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("type", type)
    .single();

  if (error || !data) return null;
  return data as EmailTemplate;
}

/** Sample data for template previews and test sends */
export function getSampleVariables(type: string): Record<string, string> {
  const base = {
    business_name: "Acme Payments Inc.",
    dashboard_url: "https://merchant.goblink.io/dashboard",
  };

  switch (type) {
    case "verification":
      return {
        ...base,
        verification_url: "https://merchant.goblink.io/auth/callback?code=sample",
      };
    case "password_reset":
      return {
        ...base,
        reset_url: "https://merchant.goblink.io/auth/callback?code=sample",
      };
    case "welcome":
      return base;
    case "payment_received":
      return {
        ...base,
        amount: "150.00",
        currency: "USD",
        crypto_amount: "150.00",
        crypto_token: "USDC",
        crypto_chain: "Base",
        customer_wallet: "0x1234...abcd",
        order_id: "ORD-2026-001",
        tx_hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        payment_url: "https://merchant.goblink.io/dashboard/payments/sample-id",
      };
    case "payment_failed":
      return {
        ...base,
        amount: "75.00",
        currency: "USD",
        order_id: "ORD-2026-002",
        reason: "Payment expired — customer did not complete payment in time",
        payment_url: "https://merchant.goblink.io/dashboard/payments/sample-id",
      };
    case "ticket_reply":
      return {
        ...base,
        ticket_subject: "Issue with payment integration",
        message_preview: "Hi, we've looked into your issue and found that the webhook URL was misconfigured. Please update it in Settings > Webhooks and try again.",
        ticket_status: "in_progress",
        ticket_url: "https://merchant.goblink.io/dashboard/support/sample-id",
      };
    case "withdrawal_complete":
      return {
        ...base,
        amount: "500.00",
        currency: "USD",
        destination_address: "0x9876...fedc",
        destination_chain: "Base",
        destination_token: "USDC",
        tx_hash: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
        wallet_url: "https://merchant.goblink.io/dashboard/wallet",
      };
    case "weekly_summary":
      return {
        ...base,
        total_revenue: "2,450.00",
        payment_count: "34",
        top_token: "USDC",
        top_chain: "Base",
        trend_percent: "12",
        trend_direction: "\u2191",
        trend_color: "#4ade80",
        open_tickets: "2",
      };
    default:
      return base;
  }
}
