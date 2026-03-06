import { getServiceClient } from "@/lib/service-client";
import type {
  AdminStats,
  AdminMerchant,
  AdminPayment,
  DailyRevenue,
  RevenueByMerchant,
  RevenueByChain,
  MerchantDetail,
  WebhookDeliveryRecord,
  IssuesMerchant,
} from "./types";

const svc = () => getServiceClient();

// ============================================================
// Overview
// ============================================================

export async function getAdminStats(): Promise<AdminStats> {
  const client = svc();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Exclude test payments from admin stats
  const [merchantsRes, paymentsRes, confirmedRes, activeMerchantsRes] =
    await Promise.all([
      client.from("merchants").select("id", { count: "exact", head: true }),
      client.from("payments").select("id", { count: "exact", head: true }).eq("is_test", false),
      client
        .from("payments")
        .select("amount, fee_amount")
        .eq("status", "confirmed")
        .eq("is_test", false),
      client
        .from("payments")
        .select("merchant_id")
        .eq("status", "confirmed")
        .eq("is_test", false)
        .gte("confirmed_at", thirtyDaysAgo.toISOString()),
    ]);

  const totalVolume =
    confirmedRes.data?.reduce((s, p) => s + Number(p.amount || 0), 0) ?? 0;
  const feeRevenue =
    confirmedRes.data?.reduce((s, p) => s + Number(p.fee_amount || 0), 0) ?? 0;

  const uniqueActive = new Set(
    activeMerchantsRes.data?.map((p) => p.merchant_id)
  );

  return {
    totalMerchants: merchantsRes.count ?? 0,
    totalPayments: paymentsRes.count ?? 0,
    totalVolume,
    feeRevenue,
    activeMerchants: uniqueActive.size,
  };
}

export async function getRecentPayments(
  limit: number = 20
): Promise<AdminPayment[]> {
  const { data } = await svc()
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getNewMerchants(days: number = 7): Promise<AdminMerchant[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await svc()
    .from("merchants")
    .select("*")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ============================================================
// Daily revenue for charts
// ============================================================

export async function getDailyRevenue(days: number = 30): Promise<DailyRevenue[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await svc()
    .from("payments")
    .select("amount, fee_amount, confirmed_at")
    .eq("status", "confirmed")
    .eq("is_test", false)
    .gte("confirmed_at", since.toISOString())
    .order("confirmed_at", { ascending: true });

  if (!data) return [];

  const byDay = new Map<string, DailyRevenue>();
  for (const p of data) {
    const day = new Date(p.confirmed_at).toISOString().slice(0, 10);
    const existing = byDay.get(day) ?? { date: day, revenue: 0, volume: 0, count: 0 };
    existing.revenue += Number(p.fee_amount || 0);
    existing.volume += Number(p.amount || 0);
    existing.count += 1;
    byDay.set(day, existing);
  }

  // Fill in missing days with zeros
  const result: DailyRevenue[] = [];
  const current = new Date(since);
  const today = new Date();
  while (current <= today) {
    const day = current.toISOString().slice(0, 10);
    result.push(byDay.get(day) ?? { date: day, revenue: 0, volume: 0, count: 0 });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

// ============================================================
// Merchants
// ============================================================

export async function getAllMerchants(): Promise<AdminMerchant[]> {
  const client = svc();

  const { data: merchants } = await client
    .from("merchants")
    .select("*")
    .order("created_at", { ascending: false });

  if (!merchants) return [];

  // Enrich with payment stats
  const enriched: AdminMerchant[] = [];
  for (const m of merchants) {
    const { data: stats } = await client
      .from("payments")
      .select("amount")
      .eq("merchant_id", m.id)
      .eq("status", "confirmed");

    enriched.push({
      ...m,
      total_volume: stats?.reduce((s, p) => s + Number(p.amount || 0), 0) ?? 0,
      total_payments: stats?.length ?? 0,
    });
  }

  // Fetch emails from auth.users via service role
  const { data: authUsers } = await client.auth.admin.listUsers();
  const emailMap = new Map<string, string>();
  if (authUsers?.users) {
    for (const u of authUsers.users) {
      emailMap.set(u.id, u.email ?? "");
    }
  }

  return enriched.map((m) => ({
    ...m,
    email: emailMap.get(m.user_id) ?? "",
  }));
}

export async function getMerchantDetail(
  merchantId: string
): Promise<MerchantDetail | null> {
  const client = svc();

  const { data: merchant } = await client
    .from("merchants")
    .select("*")
    .eq("id", merchantId)
    .single();

  if (!merchant) return null;

  const [paymentsRes, apiKeysRes, webhooksRes, authUsersRes] = await Promise.all([
    client
      .from("payments")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(50),
    client
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchantId),
    client
      .from("webhook_endpoints")
      .select("id, url, events, is_active, created_at")
      .eq("merchant_id", merchantId),
    client.auth.admin.listUsers(),
  ]);

  const emailMap = new Map<string, string>();
  if (authUsersRes.data?.users) {
    for (const u of authUsersRes.data.users) {
      emailMap.set(u.id, u.email ?? "");
    }
  }

  return {
    ...merchant,
    email: emailMap.get(merchant.user_id) ?? "",
    payments: paymentsRes.data ?? [],
    api_key_count: apiKeysRes.count ?? 0,
    webhook_endpoints: webhooksRes.data ?? [],
  };
}

export async function suspendMerchant(merchantId: string): Promise<void> {
  await svc()
    .from("merchants")
    .update({ suspended_at: new Date().toISOString() })
    .eq("id", merchantId);
}

export async function unsuspendMerchant(merchantId: string): Promise<void> {
  await svc()
    .from("merchants")
    .update({ suspended_at: null })
    .eq("id", merchantId);
}

// ============================================================
// Payments (global)
// ============================================================

export async function getGlobalPayments(params: {
  status?: string;
  merchantId?: string;
  chain?: string;
  token?: string;
  search?: string;
  isTest?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: AdminPayment[]; total: number }> {
  const client = svc();
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  let query = client
    .from("payments")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.status) query = query.eq("status", params.status);
  if (params.merchantId) query = query.eq("merchant_id", params.merchantId);
  if (params.chain) query = query.eq("crypto_chain", params.chain);
  if (params.token) query = query.eq("crypto_token", params.token);
  if (params.isTest !== undefined) query = query.eq("is_test", params.isTest === "true");
  if (params.search) {
    const term = `%${params.search.replace(/[,.*()]/g, "")}%`;
    query = query.or(
      `id.ilike.${term},external_order_id.ilike.${term},send_tx_hash.ilike.${term}`
    );
  }

  const { data, count } = await query;

  // Enrich with merchant names
  const merchantIds = [...new Set((data ?? []).map((p) => p.merchant_id))];
  const { data: merchants } = await client
    .from("merchants")
    .select("id, business_name")
    .in("id", merchantIds.length > 0 ? merchantIds : ["__none__"]);

  const nameMap = new Map<string, string>();
  merchants?.forEach((m) => nameMap.set(m.id, m.business_name));

  const enriched = (data ?? []).map((p) => ({
    ...p,
    merchant_name: nameMap.get(p.merchant_id) ?? "Unknown",
  }));

  return { data: enriched, total: count ?? 0 };
}

// ============================================================
// Revenue
// ============================================================

export async function getRevenueStats(): Promise<{
  today: number;
  thisWeek: number;
  thisMonth: number;
  allTime: number;
  avgFeePerPayment: number;
  projectedMonthly: number;
}> {
  const client = svc();
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: allConfirmed } = await client
    .from("payments")
    .select("fee_amount, confirmed_at")
    .eq("status", "confirmed")
    .eq("is_test", false);

  if (!allConfirmed) {
    return { today: 0, thisWeek: 0, thisMonth: 0, allTime: 0, avgFeePerPayment: 0, projectedMonthly: 0 };
  }

  let today = 0, thisWeek = 0, thisMonth = 0, allTime = 0, last7d = 0;
  for (const p of allConfirmed) {
    const fee = Number(p.fee_amount || 0);
    const date = new Date(p.confirmed_at);
    allTime += fee;
    if (date >= todayStart) today += fee;
    if (date >= weekStart) thisWeek += fee;
    if (date >= monthStart) thisMonth += fee;
    if (date >= sevenDaysAgo) last7d += fee;
  }

  const avgFeePerPayment = allConfirmed.length > 0 ? allTime / allConfirmed.length : 0;
  const dailyAvg7d = last7d / 7;
  const projectedMonthly = dailyAvg7d * 30;

  return { today, thisWeek, thisMonth, allTime, avgFeePerPayment, projectedMonthly };
}

export async function getRevenueByMerchant(limit: number = 10): Promise<RevenueByMerchant[]> {
  const client = svc();

  const { data: payments } = await client
    .from("payments")
    .select("merchant_id, amount, fee_amount")
    .eq("status", "confirmed")
    .eq("is_test", false);

  if (!payments) return [];

  const byMerchant = new Map<string, { total_fees: number; total_volume: number; payment_count: number }>();
  for (const p of payments) {
    const existing = byMerchant.get(p.merchant_id) ?? { total_fees: 0, total_volume: 0, payment_count: 0 };
    existing.total_fees += Number(p.fee_amount || 0);
    existing.total_volume += Number(p.amount || 0);
    existing.payment_count += 1;
    byMerchant.set(p.merchant_id, existing);
  }

  const merchantIds = [...byMerchant.keys()];
  const { data: merchants } = await client
    .from("merchants")
    .select("id, business_name")
    .in("id", merchantIds.length > 0 ? merchantIds : ["__none__"]);

  const nameMap = new Map<string, string>();
  merchants?.forEach((m) => nameMap.set(m.id, m.business_name));

  return [...byMerchant.entries()]
    .map(([id, stats]) => ({
      merchant_id: id,
      business_name: nameMap.get(id) ?? "Unknown",
      ...stats,
    }))
    .sort((a, b) => b.total_fees - a.total_fees)
    .slice(0, limit);
}

export async function getRevenueByChain(): Promise<RevenueByChain[]> {
  const { data } = await svc()
    .from("payments")
    .select("crypto_chain, fee_amount")
    .eq("status", "confirmed")
    .eq("is_test", false);

  if (!data) return [];

  const byChain = new Map<string, { total_fees: number; count: number }>();
  for (const p of data) {
    const chain = p.crypto_chain ?? "Unknown";
    const existing = byChain.get(chain) ?? { total_fees: 0, count: 0 };
    existing.total_fees += Number(p.fee_amount || 0);
    existing.count += 1;
    byChain.set(chain, existing);
  }

  return [...byChain.entries()]
    .map(([chain, stats]) => ({ chain, ...stats }))
    .sort((a, b) => b.total_fees - a.total_fees);
}

// ============================================================
// Analytics
// ============================================================

export async function getPaymentsByStatus(): Promise<{ status: string; count: number }[]> {
  const { data } = await svc()
    .from("payments")
    .select("status");

  if (!data) return [];

  const counts = new Map<string, number>();
  for (const p of data) {
    counts.set(p.status, (counts.get(p.status) ?? 0) + 1);
  }

  return [...counts.entries()].map(([status, count]) => ({ status, count }));
}

export async function getPopularChains(): Promise<{ chain: string; count: number }[]> {
  const { data } = await svc()
    .from("payments")
    .select("crypto_chain")
    .not("crypto_chain", "is", null);

  if (!data) return [];

  const counts = new Map<string, number>();
  for (const p of data) {
    const chain = p.crypto_chain ?? "Unknown";
    counts.set(chain, (counts.get(chain) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([chain, count]) => ({ chain, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getPopularTokens(): Promise<{ token: string; count: number }[]> {
  const { data } = await svc()
    .from("payments")
    .select("crypto_token")
    .not("crypto_token", "is", null);

  if (!data) return [];

  const counts = new Map<string, number>();
  for (const p of data) {
    const token = p.crypto_token ?? "Unknown";
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([token, count]) => ({ token, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getConversionRate(): Promise<{ created: number; confirmed: number; rate: number }> {
  const { count: created } = await svc()
    .from("payments")
    .select("id", { count: "exact", head: true });

  const { count: confirmed } = await svc()
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("status", "confirmed");

  const total = created ?? 0;
  const conf = confirmed ?? 0;
  return {
    created: total,
    confirmed: conf,
    rate: total > 0 ? (conf / total) * 100 : 0,
  };
}

export async function getNewMerchantsPerWeek(): Promise<{ week: string; count: number }[]> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data } = await svc()
    .from("merchants")
    .select("created_at")
    .gte("created_at", ninetyDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  if (!data) return [];

  const byWeek = new Map<string, number>();
  for (const m of data) {
    const d = new Date(m.created_at);
    const weekStart = new Date(d);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    byWeek.set(key, (byWeek.get(key) ?? 0) + 1);
  }

  return [...byWeek.entries()]
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

// ============================================================
// Issues
// ============================================================

export async function getFailedPayments(days: number = 7): Promise<AdminPayment[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const client = svc();
  const { data } = await client
    .from("payments")
    .select("*")
    .eq("status", "failed")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (!data) return [];

  const merchantIds = [...new Set(data.map((p) => p.merchant_id))];
  const { data: merchants } = await client
    .from("merchants")
    .select("id, business_name")
    .in("id", merchantIds.length > 0 ? merchantIds : ["__none__"]);

  const nameMap = new Map<string, string>();
  merchants?.forEach((m) => nameMap.set(m.id, m.business_name));

  return data.map((p) => ({ ...p, merchant_name: nameMap.get(p.merchant_id) ?? "Unknown" }));
}

export async function getStuckPayments(): Promise<AdminPayment[]> {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const client = svc();
  const { data } = await client
    .from("payments")
    .select("*")
    .eq("status", "processing")
    .lte("updated_at", oneHourAgo.toISOString())
    .order("updated_at", { ascending: true });

  if (!data) return [];

  const merchantIds = [...new Set(data.map((p) => p.merchant_id))];
  const { data: merchants } = await client
    .from("merchants")
    .select("id, business_name")
    .in("id", merchantIds.length > 0 ? merchantIds : ["__none__"]);

  const nameMap = new Map<string, string>();
  merchants?.forEach((m) => nameMap.set(m.id, m.business_name));

  return data.map((p) => ({ ...p, merchant_name: nameMap.get(p.merchant_id) ?? "Unknown" }));
}

export async function getWebhookFailures(limit: number = 50): Promise<WebhookDeliveryRecord[]> {
  const client = svc();
  const { data } = await client
    .from("webhook_deliveries")
    .select("*")
    .is("delivered_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data) return [];

  // Enrich with endpoint URLs and merchant names
  const endpointIds = [...new Set(data.map((d) => d.webhook_endpoint_id))];
  const { data: endpoints } = await client
    .from("webhook_endpoints")
    .select("id, url, merchant_id")
    .in("id", endpointIds.length > 0 ? endpointIds : ["__none__"]);

  const merchantIds = [...new Set(endpoints?.map((e) => e.merchant_id) ?? [])];
  const { data: merchants } = await client
    .from("merchants")
    .select("id, business_name")
    .in("id", merchantIds.length > 0 ? merchantIds : ["__none__"]);

  const endpointMap = new Map<string, { url: string; merchant_id: string }>();
  endpoints?.forEach((e) => endpointMap.set(e.id, { url: e.url, merchant_id: e.merchant_id }));

  const nameMap = new Map<string, string>();
  merchants?.forEach((m) => nameMap.set(m.id, m.business_name));

  return data.map((d) => {
    const endpoint = endpointMap.get(d.webhook_endpoint_id);
    return {
      ...d,
      endpoint_url: endpoint?.url ?? "Unknown",
      merchant_name: endpoint ? (nameMap.get(endpoint.merchant_id) ?? "Unknown") : "Unknown",
    };
  });
}

export async function getMerchantsWithHighFailureRate(
  days: number = 30,
  threshold: number = 20
): Promise<IssuesMerchant[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const client = svc();
  const { data: payments } = await client
    .from("payments")
    .select("merchant_id, status")
    .gte("created_at", since.toISOString());

  if (!payments) return [];

  const byMerchant = new Map<string, { total: number; failed: number }>();
  for (const p of payments) {
    const existing = byMerchant.get(p.merchant_id) ?? { total: 0, failed: 0 };
    existing.total += 1;
    if (p.status === "failed") existing.failed += 1;
    byMerchant.set(p.merchant_id, existing);
  }

  const highFailure = [...byMerchant.entries()]
    .filter(([, stats]) => stats.total >= 5 && (stats.failed / stats.total) * 100 >= threshold)
    .map(([id, stats]) => ({
      merchant_id: id,
      business_name: "",
      total_payments: stats.total,
      failed_payments: stats.failed,
      failure_rate: (stats.failed / stats.total) * 100,
    }));

  if (highFailure.length === 0) return [];

  const ids = highFailure.map((m) => m.merchant_id);
  const { data: merchants } = await client
    .from("merchants")
    .select("id, business_name")
    .in("id", ids);

  const nameMap = new Map<string, string>();
  merchants?.forEach((m) => nameMap.set(m.id, m.business_name));

  return highFailure.map((m) => ({
    ...m,
    business_name: nameMap.get(m.merchant_id) ?? "Unknown",
  }));
}

// ============================================================
// System
// ============================================================

export async function getWebhookSuccessRate(
  hours: number
): Promise<{ total: number; delivered: number; rate: number }> {
  const since = new Date();
  since.setHours(since.getHours() - hours);

  const client = svc();
  const { count: total } = await client
    .from("webhook_deliveries")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since.toISOString());

  const { count: delivered } = await client
    .from("webhook_deliveries")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since.toISOString())
    .not("delivered_at", "is", null);

  const t = total ?? 0;
  const d = delivered ?? 0;
  return { total: t, delivered: d, rate: t > 0 ? (d / t) * 100 : 100 };
}

export async function getTableCounts(): Promise<{ table: string; count: number }[]> {
  const client = svc();
  const tables = [
    "merchants",
    "payments",
    "api_keys",
    "refunds",
    "invoices",
    "webhook_endpoints",
    "webhook_deliveries",
    "offramp_configs",
    "withdrawals",
    "audit_logs",
  ];

  const results = await Promise.all(
    tables.map(async (table) => {
      const { count } = await client
        .from(table)
        .select("id", { count: "exact", head: true });
      return { table, count: count ?? 0 };
    })
  );

  return results;
}

export async function getCronStatus(): Promise<{
  settlePayments: string | null;
  retryWebhooks: string | null;
}> {
  const client = svc();

  // Use the most recent webhook delivery as a proxy for retry-webhooks cron
  const { data: lastWebhookRetry } = await client
    .from("webhook_deliveries")
    .select("created_at")
    .gt("attempt", 1)
    .order("created_at", { ascending: false })
    .limit(1);

  // Use the most recent confirmed payment as a proxy for settle-payments cron
  const { data: lastSettlement } = await client
    .from("payments")
    .select("confirmed_at")
    .eq("status", "confirmed")
    .order("confirmed_at", { ascending: false })
    .limit(1);

  return {
    settlePayments: lastSettlement?.[0]?.confirmed_at ?? null,
    retryWebhooks: lastWebhookRetry?.[0]?.created_at ?? null,
  };
}
