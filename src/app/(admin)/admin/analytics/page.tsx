import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { StatsGridSkeleton, ChartSkeleton } from "@/components/admin/loading";
import {
  VolumeLineChart,
  StatusPieChart,
  HorizontalBarChart,
  MerchantsPerWeekChart,
} from "@/components/admin/charts";
import {
  getDailyRevenue,
  getPaymentsByStatus,
  getPopularChains,
  getPopularTokens,
  getConversionRate,
  getNewMerchantsPerWeek,
} from "@/lib/admin/queries";
import { formatCurrency } from "@/lib/utils";
import { Percent, TrendingUp, Users } from "lucide-react";

export const dynamic = "force-dynamic";

async function ConversionStats() {
  const conv = await getConversionRate();
  const dailyData = await getDailyRevenue(30);
  const totalVolumeLast30 = dailyData.reduce((s, d) => s + d.volume, 0);
  const totalVolumeFirst15 = dailyData.slice(0, 15).reduce((s, d) => s + d.volume, 0);
  const totalVolumeLast15 = dailyData.slice(15).reduce((s, d) => s + d.volume, 0);
  const growth = totalVolumeFirst15 > 0
    ? ((totalVolumeLast15 - totalVolumeFirst15) / totalVolumeFirst15 * 100)
    : 0;
  const avgPaymentSize = conv.created > 0 ? totalVolumeLast30 / conv.confirmed : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Conversion Rate"
        value={`${conv.rate.toFixed(1)}%`}
        icon={Percent}
        subtitle={`${conv.confirmed} of ${conv.created} payments`}
      />
      <StatCard
        title="Avg Payment Size"
        value={formatCurrency(avgPaymentSize)}
        icon={TrendingUp}
        subtitle="Confirmed payments (30d)"
      />
      <StatCard
        title="Volume Growth"
        value={`${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`}
        icon={TrendingUp}
        subtitle="Last 15d vs prior 15d"
      />
      <StatCard
        title="Total Created"
        value={conv.created.toLocaleString()}
        icon={Users}
        subtitle="All-time payments created"
      />
    </div>
  );
}

async function VolumeChart() {
  const data = await getDailyRevenue(30);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Volume Over Time</CardTitle>
        <CardDescription>Last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <VolumeLineChart data={data.map(d => ({ ...d }))} />
      </CardContent>
    </Card>
  );
}

async function StatusChart() {
  const data = await getPaymentsByStatus();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments by Status</CardTitle>
        <CardDescription>Distribution across all payments</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-zinc-500 py-4">No data</p>
        ) : (
          <StatusPieChart data={data.map(d => ({ ...d }))} />
        )}
      </CardContent>
    </Card>
  );
}

async function ChainsChart() {
  const data = await getPopularChains();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Popular Source Chains</CardTitle>
        <CardDescription>Payment count by blockchain</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-zinc-500 py-4">No data</p>
        ) : (
          <HorizontalBarChart data={data.map(d => ({ ...d }))} dataKey="count" nameKey="chain" label="Payments" />
        )}
      </CardContent>
    </Card>
  );
}

async function TokensChart() {
  const data = await getPopularTokens();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Popular Tokens</CardTitle>
        <CardDescription>Payment count by token</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-zinc-500 py-4">No data</p>
        ) : (
          <HorizontalBarChart data={data.map(d => ({ ...d }))} dataKey="count" nameKey="token" label="Payments" />
        )}
      </CardContent>
    </Card>
  );
}

async function MerchantGrowthChart() {
  const data = await getNewMerchantsPerWeek();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Merchant Signups</CardTitle>
        <CardDescription>New merchants per week (last 90 days)</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-zinc-500 py-4">No data</p>
        ) : (
          <MerchantsPerWeekChart data={data.map(d => ({ ...d }))} />
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-zinc-400 mt-1">Platform-wide payment and growth analytics</p>
      </div>

      <Suspense fallback={<StatsGridSkeleton count={4} />}>
        <ConversionStats />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <VolumeChart />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <StatusChart />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <MerchantGrowthChart />
        </Suspense>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <ChainsChart />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <TokensChart />
        </Suspense>
      </div>
    </div>
  );
}
