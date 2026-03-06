import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PaymentsList } from "@/components/dashboard/payments-list";
import { getExchangeRate } from "@/lib/forex";

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
    .select("id, currency, display_currency")
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
    const sanitized = params.search.replace(/[,.*()]/g, "");
    const term = `%${sanitized}%`;
    const uuidMatch = isUUID(sanitized) ? sanitized : "00000000-0000-0000-0000-000000000000";
    query = query.or(
      `external_order_id.ilike.${term},send_tx_hash.ilike.${term},fulfillment_tx_hash.ilike.${term},id.eq.${uuidMatch}`
    );
  }

  const { data: payments, count } = await query;

  const displayCurrency = merchant.display_currency || "USD";
  const exchangeRate = await getExchangeRate(displayCurrency);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payments</h1>
          <p className="text-zinc-400 mt-1">View and manage all your payment transactions.</p>
        </div>
        <Link
          href="/dashboard/export"
          data-print-hide
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          Export
        </Link>
      </div>

      <PaymentsList
        payments={payments ?? []}
        totalCount={count ?? 0}
        currentPage={page}
        perPage={perPage}
        currency={merchant.currency}
        displayCurrency={displayCurrency}
        exchangeRate={exchangeRate}
        currentStatus={params.status || "all"}
        currentSearch={params.search || ""}
        merchantId={merchant.id}
      />
    </div>
  );
}

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}
