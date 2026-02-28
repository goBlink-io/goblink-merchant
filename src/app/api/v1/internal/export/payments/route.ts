import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getExchangeRate, formatCurrencyAmount } from "@/lib/forex";

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
    .select("id, currency, display_currency")
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
    .select(
      "id, created_at, amount, currency, crypto_token, crypto_chain, status, customer_wallet, external_order_id, fee_amount"
    )
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

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

  const dc = merchant.display_currency || "USD";
  const rate = await getExchangeRate(dc);
  const showDc = dc !== "USD";

  if (format === "json") {
    const enriched = (payments ?? []).map((p) => ({
      ...p,
      ...(showDc
        ? {
            display_amount: formatCurrencyAmount(Number(p.amount) * rate, dc),
            display_currency: dc,
          }
        : {}),
    }));
    const filename = `payments-${startDate || "all"}-${endDate || "now"}.json`;
    return new NextResponse(JSON.stringify(enriched, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // CSV
  const headers = [
    "Payment ID",
    "Date",
    "Amount (USD)",
    ...(showDc ? [`Amount (${dc})`] : []),
    "Currency",
    "Token",
    "Chain",
    "Status",
    "Customer",
    "Order ID",
    "Fee",
  ];

  const rows = (payments ?? []).map((p) => [
    p.id,
    new Date(p.created_at).toISOString(),
    p.amount,
    ...(showDc ? [formatCurrencyAmount(Number(p.amount) * rate, dc)] : []),
    p.currency,
    p.crypto_token || "",
    p.crypto_chain || "",
    p.status,
    p.customer_wallet || "",
    p.external_order_id || "",
    p.fee_amount || "0",
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const filename = `payments-${startDate || "all"}-${endDate || "now"}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
