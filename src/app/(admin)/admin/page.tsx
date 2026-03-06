import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/admin/stat-card";
import { StatsGridSkeleton, ChartSkeleton, TableSkeleton } from "@/components/admin/loading";
import { RevenueLineChart } from "@/components/admin/charts";
import {
  getAdminStats,
  getRecentPayments,
  getNewMerchants,
  getDailyRevenue,
} from "@/lib/admin/queries";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Users, CreditCard, DollarSign, TrendingUp, Activity } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function StatsGrid() {
  const stats = await getAdminStats();
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <StatCard title="Total Merchants" value={stats.totalMerchants.toLocaleString()} icon={Users} subtitle="All time" />
      <StatCard title="Total Payments" value={stats.totalPayments.toLocaleString()} icon={CreditCard} subtitle="Live only (excl. test)" />
      <StatCard title="Total Volume" value={formatCurrency(stats.totalVolume)} icon={DollarSign} subtitle="Confirmed payments" />
      <StatCard title="Fee Revenue" value={formatCurrency(stats.feeRevenue)} icon={TrendingUp} subtitle="Our total earnings" />
      <StatCard title="Active Merchants" value={stats.activeMerchants.toLocaleString()} icon={Activity} subtitle="Payment in last 30d" />
    </div>
  );
}

async function RevenueChart() {
  const data = await getDailyRevenue(30);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue (Last 30 Days)</CardTitle>
        <CardDescription>Daily fee income</CardDescription>
      </CardHeader>
      <CardContent>
        <RevenueLineChart data={data.map(d => ({ ...d }))} />
      </CardContent>
    </Card>
  );
}

async function RecentPaymentsFeed() {
  const payments = await getRecentPayments(20);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Last 20 across all merchants</CardDescription>
          </div>
          <Link href="/admin/payments" className="text-sm text-blue-400 hover:text-blue-300">
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-center text-zinc-500 py-8">No payments yet</p>
        ) : (
          <div className="space-y-1">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {p.external_order_id || p.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-zinc-500">{formatDate(p.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {p.is_test && (
                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]" variant="outline">
                      Test
                    </Badge>
                  )}
                  <Badge className={getStatusColor(p.status)} variant="outline">
                    {p.status}
                  </Badge>
                  <span className="text-sm font-medium text-white">
                    {formatCurrency(Number(p.amount), p.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function NewMerchantsFeed() {
  const merchants = await getNewMerchants(7);
  return (
    <Card>
      <CardHeader>
        <CardTitle>New Merchants</CardTitle>
        <CardDescription>Signed up in the last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        {merchants.length === 0 ? (
          <p className="text-center text-zinc-500 py-8">No new signups</p>
        ) : (
          <div className="space-y-1">
            {merchants.map((m) => (
              <Link
                key={m.id}
                href={`/admin/merchants/${m.id}`}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-white">{m.business_name}</p>
                  <p className="text-xs text-zinc-500">{m.country}</p>
                </div>
                <span className="text-xs text-zinc-500">{formatDate(m.created_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminOverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Overview</h1>
        <p className="text-zinc-400 mt-1">Platform-wide metrics and activity</p>
      </div>

      <Suspense fallback={<StatsGridSkeleton count={5} />}>
        <StatsGrid />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<TableSkeleton rows={5} />}>
          <RecentPaymentsFeed />
        </Suspense>
        <Suspense fallback={<TableSkeleton rows={5} />}>
          <NewMerchantsFeed />
        </Suspense>
      </div>
    </div>
  );
}
