import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OverviewContent } from "@/components/dashboard/overview-content";
import { getExchangeRate } from "@/lib/forex";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/login");

  // Get today's start in UTC
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Default: fetch live (non-test) data for SSR
  const { data: recentPayments } = await supabase
    .from("payments")
    .select("id, external_order_id, amount, currency, status, created_at, is_test")
    .eq("merchant_id", merchant.id)
    .eq("is_test", false)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: todayPayments } = await supabase
    .from("payments")
    .select("net_amount")
    .eq("merchant_id", merchant.id)
    .eq("status", "confirmed")
    .eq("is_test", false)
    .gte("confirmed_at", todayStart.toISOString());

  const { count: pendingCount } = await supabase
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("merchant_id", merchant.id)
    .eq("is_test", false)
    .in("status", ["pending", "processing"]);

  const { data: allConfirmed } = await supabase
    .from("payments")
    .select("net_amount")
    .eq("merchant_id", merchant.id)
    .eq("status", "confirmed")
    .eq("is_test", false);

  const todayRevenue = todayPayments?.reduce(
    (sum, p) => sum + (Number(p.net_amount) || 0),
    0
  ) ?? 0;

  const totalBalance = allConfirmed?.reduce(
    (sum, p) => sum + (Number(p.net_amount) || 0),
    0
  ) ?? 0;

  const totalPayments = allConfirmed?.length ?? 0;

  // Get exchange rate for display currency
  const displayCurrency = merchant.display_currency || "USD";
  const exchangeRate = await getExchangeRate(displayCurrency);

  return (
    <OverviewContent
      data={{
        totalBalance,
        todayRevenue,
        pendingCount: pendingCount ?? 0,
        totalPayments,
        recentPayments: recentPayments ?? [],
        currency: merchant.currency,
        displayCurrency,
        exchangeRate,
        settlementToken: merchant.settlement_token,
        settlementChain: merchant.settlement_chain,
        businessName: merchant.business_name,
        onboardingChecklist: merchant.onboarding_checklist ?? null,
        firstPaymentCelebrated: merchant.first_payment_celebrated ?? false,
        merchantId: merchant.id,
      }}
    />
  );
}
