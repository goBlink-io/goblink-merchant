import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { StatsGridSkeleton, ChartSkeleton, TableSkeleton } from "@/components/admin/loading";
import { RevenueLineChart, VerticalBarChart } from "@/components/admin/charts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getRevenueStats,
  getDailyRevenue,
  getRevenueByMerchant,
  getRevenueByChain,
} from "@/lib/admin/queries";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, Calendar, TrendingUp, Target } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function RevenueStats() {
  const stats = await getRevenueStats();
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard title="Today" value={formatCurrency(stats.today)} icon={DollarSign} />
      <StatCard title="This Week" value={formatCurrency(stats.thisWeek)} icon={Calendar} />
      <StatCard title="This Month" value={formatCurrency(stats.thisMonth)} icon={Calendar} />
      <StatCard title="All Time" value={formatCurrency(stats.allTime)} icon={TrendingUp} />
      <StatCard title="Avg Fee/Payment" value={formatCurrency(stats.avgFeePerPayment)} icon={Target} />
      <StatCard title="Projected Monthly" value={formatCurrency(stats.projectedMonthly)} icon={TrendingUp} subtitle="Based on last 7 days" />
    </div>
  );
}

async function DailyRevenueChart() {
  const data = await getDailyRevenue(30);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Fee Revenue</CardTitle>
        <CardDescription>Last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <RevenueLineChart data={data.map(d => ({ ...d }))} />
      </CardContent>
    </Card>
  );
}

async function RevenueByMerchantTable() {
  const data = await getRevenueByMerchant(10);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by Merchant</CardTitle>
        <CardDescription>Top 10 by fee revenue</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-zinc-500 py-4">No data</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead className="text-right">Fee Revenue</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">Payments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((m, i) => (
                <TableRow key={m.merchant_id}>
                  <TableCell className="text-zinc-500">{i + 1}</TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/merchants/${m.merchant_id}`}
                      className="text-white hover:text-blue-400"
                    >
                      {m.business_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-medium text-emerald-400">
                    {formatCurrency(m.total_fees)}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(m.total_volume)}</TableCell>
                  <TableCell className="text-right">{m.payment_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

async function RevenueByChainChart() {
  const data = await getRevenueByChain();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by Chain</CardTitle>
        <CardDescription>Fee revenue per blockchain</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-zinc-500 py-4">No data</p>
        ) : (
          <VerticalBarChart
            data={data.map(d => ({ ...d }))}
            dataKey="total_fees"
            nameKey="chain"
            label="Fee Revenue"
            formatter={(v) => `$${v.toLocaleString()}`}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminRevenuePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Revenue</h1>
        <p className="text-zinc-400 mt-1">Platform fee revenue analytics</p>
      </div>

      <Suspense fallback={<StatsGridSkeleton count={6} />}>
        <RevenueStats />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <DailyRevenueChart />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<TableSkeleton rows={10} />}>
          <RevenueByMerchantTable />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <RevenueByChainChart />
        </Suspense>
      </div>
    </div>
  );
}
