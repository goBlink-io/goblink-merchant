import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PaymentLinksContent } from "@/components/dashboard/payment-links-content";

export const dynamic = "force-dynamic";

export default async function PaymentLinksPage() {
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

  // Fetch payment links (payments with source: "payment_link" in metadata)
  const { data: links } = await supabase
    .from("payments")
    .select("id, amount, currency, status, payment_url, metadata, expires_at, created_at")
    .eq("merchant_id", merchant.id)
    .contains("metadata", { source: "payment_link" })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Payment Links</h1>
        <p className="text-zinc-400 mt-1">
          Create and share payment links with your customers.
        </p>
      </div>

      <PaymentLinksContent
        initialLinks={links ?? []}
        currency={merchant.currency || "USD"}
      />
    </div>
  );
}
