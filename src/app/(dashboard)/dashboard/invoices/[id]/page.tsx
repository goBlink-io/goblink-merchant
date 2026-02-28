import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { InvoiceDetailContent } from "@/components/invoices/invoice-detail-content";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, business_name")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/login");

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("merchant_id", merchant.id)
    .single();

  if (!invoice) notFound();

  return (
    <div className="space-y-6">
      <InvoiceDetailContent
        invoice={invoice}
        merchantName={merchant.business_name || ""}
      />
    </div>
  );
}
