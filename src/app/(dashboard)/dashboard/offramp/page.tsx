import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OfframpContent } from "@/components/offramp/OfframpContent";

export const dynamic = "force-dynamic";

export default async function OfframpPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select(
      "id, wallet_address, settlement_chain, settlement_token, offramp_provider, offramp_currency, shakepay_deposit_address, currency"
    )
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Convert to Fiat</h1>
        <p className="text-zinc-400 mt-1">
          Turn your crypto into cash. Choose a provider below.
        </p>
      </div>

      <OfframpContent merchant={merchant} />
    </div>
  );
}
