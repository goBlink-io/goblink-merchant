import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InvoicesContent } from "@/components/invoices/invoices-content";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
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

  // Fetch initial invoices
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Invoices</h1>
        <p className="text-zinc-400 mt-1">
          Create and manage invoices for your customers.
        </p>
      </div>

      <InvoicesContent
        merchantId={merchant.id}
        initialInvoices={invoices ?? []}
        currency={merchant.currency || "USD"}
      />
    </div>
  );
}
