import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsContent } from "@/components/dashboard/settings-content";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/login");

  // Fetch API keys
  const { data: apiKeys } = await supabase
    .from("api_keys")
    .select("id, key_prefix, label, is_test, last_used_at, created_at, allowed_ips")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  // Fetch webhook endpoints
  const { data: webhooks } = await supabase
    .from("webhook_endpoints")
    .select("id, url, events, is_active, created_at")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-zinc-400 mt-1">Manage your merchant account and integrations.</p>
      </div>

      <SettingsContent
        merchant={merchant}
        apiKeys={apiKeys ?? []}
        webhooks={webhooks ?? []}
        notificationPreferences={merchant.notification_preferences ?? {
          payment_received: true,
          payment_failed: true,
          ticket_reply: true,
          withdrawal_complete: true,
          weekly_summary: false,
        }}
      />
    </div>
  );
}
