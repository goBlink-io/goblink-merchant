import type { SupabaseClient } from "@supabase/supabase-js";
import { formatCurrency, formatDate, truncateAddress } from "@/lib/utils";

/** Fetch and format recent payments summary */
export async function checkPayments(
  merchantId: string,
  supabase: SupabaseClient
): Promise<string> {
  const { data: payments } = await supabase
    .from("payments")
    .select("id, status, amount, currency, created_at, order_id")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!payments || payments.length === 0) {
    return "You don't have any payments yet. Create your first payment using a payment link or the API!";
  }

  const statusEmoji: Record<string, string> = {
    confirmed: "✅",
    processing: "⏳",
    pending: "🕐",
    failed: "❌",
    expired: "⏰",
    refunded: "↩️",
    partially_refunded: "↩️",
  };

  let msg = "**Your recent payments:**\n\n";
  for (const p of payments) {
    const emoji = statusEmoji[p.status] ?? "•";
    const amount = formatCurrency(p.amount, p.currency);
    const date = formatDate(p.created_at);
    const orderId = p.order_id ? ` (${p.order_id})` : "";
    msg += `${emoji} ${amount}${orderId} — **${p.status}** — ${date}\n`;
  }

  // Summary counts
  const { count: totalCount } = await supabase
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("merchant_id", merchantId);

  const { count: confirmedToday } = await supabase
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("merchant_id", merchantId)
    .eq("status", "confirmed")
    .gte("created_at", new Date().toISOString().split("T")[0]);

  msg += `\n**Total payments:** ${totalCount ?? 0} | **Confirmed today:** ${confirmedToday ?? 0}`;

  return msg;
}

/** Fetch and format wallet balance info */
export async function checkWallet(
  merchantId: string,
  supabase: SupabaseClient
): Promise<string> {
  const { data: merchant } = await supabase
    .from("merchants")
    .select("wallet_address, settlement_token, settlement_chain, currency")
    .eq("id", merchantId)
    .single();

  if (!merchant?.wallet_address || merchant.wallet_address === "not configured") {
    return "Your wallet hasn't been configured yet. Go to **Settings → Payment Preferences** to set up your wallet address.";
  }

  // Get confirmed payment totals as a proxy for balance info
  const { data: confirmedPayments } = await supabase
    .from("payments")
    .select("amount, currency")
    .eq("merchant_id", merchantId)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })
    .limit(10);

  const totalConfirmed = confirmedPayments?.reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0;

  let msg = "**Your wallet info:**\n\n";
  msg += `- **Address:** \`${truncateAddress(merchant.wallet_address, 8)}\`\n`;
  msg += `- **Chain:** ${merchant.settlement_chain}\n`;
  msg += `- **Token:** ${merchant.settlement_token}\n`;
  msg += `- **Recent confirmed volume:** ${formatCurrency(totalConfirmed, merchant.currency ?? "USD")} (last 10 payments)\n`;
  msg += `\nFor your exact on-chain balance, check your wallet address on a block explorer.`;

  return msg;
}

/** Fetch and format webhook endpoints and recent delivery status */
export async function checkWebhooks(
  merchantId: string,
  supabase: SupabaseClient
): Promise<string> {
  const { data: endpoints } = await supabase
    .from("webhook_endpoints")
    .select("id, url, is_active, created_at")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });

  if (!endpoints || endpoints.length === 0) {
    return "You don't have any webhook endpoints configured. Go to **Settings → Webhooks** to add one.";
  }

  let msg = "**Your webhook endpoints:**\n\n";
  for (const ep of endpoints) {
    const status = ep.is_active ? "✅ Active" : "❌ Inactive";
    msg += `- \`${ep.url}\` — ${status}\n`;
  }

  // Check recent delivery failures
  const { data: failures } = await supabase
    .from("webhook_deliveries")
    .select("webhook_endpoint_id, status_code, created_at")
    .eq("merchant_id", merchantId)
    .neq("status_code", 200)
    .order("created_at", { ascending: false })
    .limit(5);

  if (failures && failures.length > 0) {
    msg += `\n**Recent delivery failures:** ${failures.length}\n`;
    for (const f of failures) {
      msg += `- Status ${f.status_code ?? "timeout"} — ${formatDate(f.created_at)}\n`;
    }
    msg += `\nCheck **Settings → Webhooks** for full delivery logs.`;
  } else {
    msg += `\nNo recent delivery failures — looking good!`;
  }

  return msg;
}

/** Fetch and format recent payment errors */
export async function checkErrors(
  merchantId: string,
  supabase: SupabaseClient
): Promise<string> {
  const { data: errors } = await supabase
    .from("payments")
    .select("id, status, amount, currency, created_at, order_id, failure_reason")
    .eq("merchant_id", merchantId)
    .in("status", ["failed", "expired"])
    .order("created_at", { ascending: false })
    .limit(5);

  if (!errors || errors.length === 0) {
    return "No recent payment errors — everything is running smoothly! 🎉";
  }

  let msg = "**Your recent payment errors:**\n\n";
  for (const e of errors) {
    const amount = formatCurrency(e.amount, e.currency);
    const date = formatDate(e.created_at);
    const reason = e.failure_reason ?? e.status;
    const orderId = e.order_id ? ` (${e.order_id})` : "";
    msg += `- ${amount}${orderId} — **${reason}** — ${date}\n`;
  }

  msg += `\nIf you're seeing recurring failures, check that your integration is configured correctly or create a support ticket for help.`;

  return msg;
}

/** Run the appropriate dynamic handler based on action type */
export async function runHandler(
  action: string,
  merchantId: string,
  supabase: SupabaseClient
): Promise<string | null> {
  switch (action) {
    case "check_payments":
      return checkPayments(merchantId, supabase);
    case "check_wallet":
      return checkWallet(merchantId, supabase);
    case "check_webhooks":
      return checkWebhooks(merchantId, supabase);
    case "check_errors":
      return checkErrors(merchantId, supabase);
    default:
      return null;
  }
}
