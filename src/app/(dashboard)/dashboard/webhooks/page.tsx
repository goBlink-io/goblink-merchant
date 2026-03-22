import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WebhooksContent } from "@/components/webhooks/webhooks-content";

export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/login");

  const { data: webhooks } = await supabase
    .from("webhook_endpoints")
    .select("id, url, events, is_active, created_at")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Webhooks</h1>
        <p className="text-zinc-400 mt-1">
          Manage endpoints and inspect delivery history.
        </p>
      </div>

      <WebhooksContent
        merchantId={merchant.id}
        webhooks={webhooks ?? []}
      />
    </div>
  );
}
