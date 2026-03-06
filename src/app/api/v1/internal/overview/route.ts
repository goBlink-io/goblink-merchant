import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getExchangeRate } from "@/lib/forex";

export const dynamic = "force-dynamic";

// GET /api/v1/internal/overview?is_test=true|false
// Internal dashboard route — session-authed, not API-key-authed
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, business_name, currency, display_currency, settlement_token, settlement_chain, onboarding_checklist, first_payment_celebrated")
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  const isTestParam = request.nextUrl.searchParams.get("is_test");
  const isTest = isTestParam === "true";

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Fetch recent payments filtered by is_test
  const { data: recentPayments } = await supabase
    .from("payments")
    .select("id, external_order_id, amount, currency, status, created_at, is_test")
    .eq("merchant_id", merchant.id)
    .eq("is_test", isTest)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch today's confirmed payments for revenue
  const { data: todayPayments } = await supabase
    .from("payments")
    .select("net_amount")
    .eq("merchant_id", merchant.id)
    .eq("status", "confirmed")
    .eq("is_test", isTest)
    .gte("confirmed_at", todayStart.toISOString());

  // Fetch pending payments count
  const { count: pendingCount } = await supabase
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("merchant_id", merchant.id)
    .eq("is_test", isTest)
    .in("status", ["pending", "processing"]);

  // Fetch total confirmed payments
  const { data: allConfirmed } = await supabase
    .from("payments")
    .select("net_amount")
    .eq("merchant_id", merchant.id)
    .eq("status", "confirmed")
    .eq("is_test", isTest);

  // Weekly comparison data for growth narrative
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay()); // Start of this week (Sunday)
  thisWeekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: thisWeekPayments } = await supabase
    .from("payments")
    .select("net_amount")
    .eq("merchant_id", merchant.id)
    .eq("status", "confirmed")
    .eq("is_test", isTest)
    .gte("confirmed_at", thisWeekStart.toISOString());

  const { data: lastWeekPayments } = await supabase
    .from("payments")
    .select("net_amount")
    .eq("merchant_id", merchant.id)
    .eq("status", "confirmed")
    .eq("is_test", isTest)
    .gte("confirmed_at", lastWeekStart.toISOString())
    .lt("confirmed_at", thisWeekStart.toISOString());

  const { count: thisMonthCount } = await supabase
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("merchant_id", merchant.id)
    .eq("status", "confirmed")
    .eq("is_test", isTest)
    .gte("confirmed_at", thisMonthStart.toISOString());

  const todayRevenue =
    todayPayments?.reduce((sum, p) => sum + (Number(p.net_amount) || 0), 0) ??
    0;

  const totalBalance =
    allConfirmed?.reduce((sum, p) => sum + (Number(p.net_amount) || 0), 0) ?? 0;

  const totalPayments = allConfirmed?.length ?? 0;

  // Get exchange rate for display currency
  const displayCurrency = merchant.display_currency || "USD";
  const exchangeRate = await getExchangeRate(displayCurrency);

  const thisWeekRevenue =
    thisWeekPayments?.reduce((sum, p) => sum + (Number(p.net_amount) || 0), 0) ?? 0;
  const lastWeekRevenue =
    lastWeekPayments?.reduce((sum, p) => sum + (Number(p.net_amount) || 0), 0) ?? 0;
  const thisWeekCount = thisWeekPayments?.length ?? 0;
  const lastWeekCount = lastWeekPayments?.length ?? 0;

  return NextResponse.json({
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
    weeklyStats: {
      thisWeekRevenue,
      lastWeekRevenue,
      thisWeekCount,
      lastWeekCount,
      monthPaymentCount: thisMonthCount ?? 0,
    },
  });
}
