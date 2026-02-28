import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
    .select("id, currency")
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const format = searchParams.get("format") || "csv";

  let query = supabase
    .from("payments")
    .select("amount, fee_amount, status, created_at")
    .eq("merchant_id", merchant.id);

  if (startDate) {
    query = query.gte("created_at", new Date(startDate).toISOString());
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);
    query = query.lt("created_at", end.toISOString());
  }

  const { data: payments, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }

  // Fetch refunds
  let refundQuery = supabase
    .from("refunds")
    .select("amount, created_at")
    .eq("merchant_id", merchant.id)
    .eq("status", "completed");

  if (startDate) {
    refundQuery = refundQuery.gte(
      "created_at",
      new Date(startDate).toISOString()
    );
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);
    refundQuery = refundQuery.lt("created_at", end.toISOString());
  }

  const { data: refunds } = await refundQuery;

  // Aggregate by month
  const monthlyMap = new Map<
    string,
    { revenue: number; fees: number; refunds: number; count: number }
  >();

  for (const p of payments ?? []) {
    if (p.status !== "confirmed") continue;
    const month = new Date(p.created_at).toISOString().slice(0, 7);
    const entry = monthlyMap.get(month) ?? {
      revenue: 0,
      fees: 0,
      refunds: 0,
      count: 0,
    };
    entry.revenue += Number(p.amount || 0);
    entry.fees += Number(p.fee_amount || 0);
    entry.count += 1;
    monthlyMap.set(month, entry);
  }

  for (const r of refunds ?? []) {
    const month = new Date(r.created_at).toISOString().slice(0, 7);
    const entry = monthlyMap.get(month) ?? {
      revenue: 0,
      fees: 0,
      refunds: 0,
      count: 0,
    };
    entry.refunds += Number(r.amount || 0);
    monthlyMap.set(month, entry);
  }

  const months = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      total_revenue: data.revenue,
      total_fees: data.fees,
      total_refunds: data.refunds,
      net_revenue: data.revenue - data.fees - data.refunds,
      payment_count: data.count,
    }));

  const totals = {
    total_revenue: months.reduce((s, m) => s + m.total_revenue, 0),
    total_fees: months.reduce((s, m) => s + m.total_fees, 0),
    total_refunds: months.reduce((s, m) => s + m.total_refunds, 0),
    net_revenue: months.reduce((s, m) => s + m.net_revenue, 0),
    payment_count: months.reduce((s, m) => s + m.payment_count, 0),
  };

  const summary = { totals, monthly_breakdown: months };

  if (format === "json") {
    const filename = `tax-summary-${startDate || "all"}-${endDate || "now"}.json`;
    return new NextResponse(JSON.stringify(summary, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // CSV
  const headers = [
    "Month",
    "Total Revenue",
    "Total Fees",
    "Total Refunds",
    "Net Revenue",
    "Payment Count",
  ];

  const rows = months.map((m) => [
    m.month,
    m.total_revenue.toFixed(2),
    m.total_fees.toFixed(2),
    m.total_refunds.toFixed(2),
    m.net_revenue.toFixed(2),
    m.payment_count,
  ]);

  // Add totals row
  rows.push([
    "TOTAL",
    totals.total_revenue.toFixed(2),
    totals.total_fees.toFixed(2),
    totals.total_refunds.toFixed(2),
    totals.net_revenue.toFixed(2),
    totals.payment_count,
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const filename = `tax-summary-${startDate || "all"}-${endDate || "now"}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
