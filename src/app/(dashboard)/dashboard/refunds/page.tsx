import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RefundsContent } from "@/components/dashboard/refunds-content";

export const dynamic = "force-dynamic";

export default async function RefundsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, currency")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/login");

  // Fetch initial refunds
  const { data: refunds } = await supabase
    .from("refunds")
    .select("*")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Refunds</h1>
        <p className="text-zinc-400 mt-1">
          View and manage all refunds across your payments.
        </p>
      </div>

      <RefundsContent
        initialRefunds={refunds ?? []}
        currency={merchant.currency || "USD"}
      />
    </div>
  );
}
