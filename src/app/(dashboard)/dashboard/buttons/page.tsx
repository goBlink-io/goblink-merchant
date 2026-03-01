import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ButtonGenerator } from "@/components/dashboard/button-generator";

export const dynamic = "force-dynamic";

export default async function ButtonsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Payment Buttons</h1>
        <p className="text-zinc-400 mt-1">
          Generate embeddable payment buttons for your website.
        </p>
      </div>
      <ButtonGenerator merchantId={merchant.id} />
    </div>
  );
}
