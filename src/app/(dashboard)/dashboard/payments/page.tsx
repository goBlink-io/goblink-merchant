import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PaymentsList } from "@/components/dashboard/payments-list";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string; is_test?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, currency")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/login");

  const page = parseInt(params.page || "1", 10);
  const perPage = 20;
  const offset = (page - 1) * perPage;
  const isTest = params.is_test === "true";

  let query = supabase
    .from("payments")
    .select("*", { count: "exact" })
    .eq("merchant_id", merchant.id)
    .eq("is_test", isTest)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  // Filter by status
  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  // Search by order ID or tx hash
  if (params.search) {
    query = query.or(
      `external_order_id.ilike.%${params.search}%,send_tx_hash.ilike.%${params.search}%,fulfillment_tx_hash.ilike.%${params.search}%,id.eq.${isUUID(params.search) ? params.search : "00000000-0000-0000-0000-000000000000"}`
    );
  }

  const { data: payments, count } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Payments</h1>
        <p className="text-zinc-400 mt-1">View and manage all your payment transactions.</p>
      </div>

      <PaymentsList
        payments={payments ?? []}
        totalCount={count ?? 0}
        currentPage={page}
        perPage={perPage}
        currency={merchant.currency}
        currentStatus={params.status || "all"}
        currentSearch={params.search || ""}
      />
    </div>
  );
}

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}
