import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { POSContent } from "@/components/pos/pos-content";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, currency, wallet_address")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Point of Sale</h1>
        <p className="text-zinc-400 mt-1">
          Accept in-person payments with QR codes.
        </p>
      </div>

      <POSContent
        currency={merchant.currency || "USD"}
      />
    </div>
  );
}
