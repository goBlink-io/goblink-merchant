import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettlementSettingsContent } from "@/components/settlement/settlement-settings-content";

export const dynamic = "force-dynamic";

export default async function SettlementSettingsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settlement Settings</h1>
        <p className="text-zinc-400 mt-1">
          Manage where your payments are settled and how to withdraw to exchanges.
        </p>
      </div>

      <SettlementSettingsContent merchant={merchant} />
    </div>
  );
}
