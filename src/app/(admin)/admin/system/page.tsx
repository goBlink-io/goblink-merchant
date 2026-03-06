import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/admin/stat-card";
import { StatsGridSkeleton, TableSkeleton } from "@/components/admin/loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getWebhookSuccessRate,
  getTableCounts,
  getCronStatus,
} from "@/lib/admin/queries";
import { formatDate } from "@/lib/utils";
import { Webhook, Database, Clock, Activity } from "lucide-react";

export const dynamic = "force-dynamic";

async function WebhookStats() {
  const [rate24h, rate7d] = await Promise.all([
    getWebhookSuccessRate(24),
    getWebhookSuccessRate(168),
  ]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Webhook Success (24h)"
        value={`${rate24h.rate.toFixed(1)}%`}
        icon={Webhook}
        subtitle={`${rate24h.delivered} of ${rate24h.total} delivered`}
      />
      <StatCard
        title="Webhook Success (7d)"
        value={`${rate7d.rate.toFixed(1)}%`}
        icon={Webhook}
        subtitle={`${rate7d.delivered} of ${rate7d.total} delivered`}
      />
      <StatCard
        title="Total Deliveries (24h)"
        value={rate24h.total.toLocaleString()}
        icon={Activity}
        subtitle="Webhook delivery attempts"
      />
      <StatCard
        title="Total Deliveries (7d)"
        value={rate7d.total.toLocaleString()}
        icon={Activity}
        subtitle="Webhook delivery attempts"
      />
    </div>
  );
}

async function CronJobStatus() {
  const status = await getCronStatus();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-400" />
          <div>
            <CardTitle>Cron Jobs</CardTitle>
            <CardDescription>Last run timestamps</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium text-white">settle-payments</TableCell>
              <TableCell className="text-zinc-400">Confirms pending payments</TableCell>
              <TableCell className="text-zinc-500 text-xs">
                {status.settlePayments ? formatDate(status.settlePayments) : "Never"}
              </TableCell>
              <TableCell>
                <Badge variant={status.settlePayments ? "success" : "warning"}>
                  {status.settlePayments ? "Active" : "No data"}
                </Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-white">retry-webhooks</TableCell>
              <TableCell className="text-zinc-400">Retries failed webhook deliveries</TableCell>
              <TableCell className="text-zinc-500 text-xs">
                {status.retryWebhooks ? formatDate(status.retryWebhooks) : "Never"}
              </TableCell>
              <TableCell>
                <Badge variant={status.retryWebhooks ? "success" : "warning"}>
                  {status.retryWebhooks ? "Active" : "No data"}
                </Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

async function DatabaseStats() {
  const counts = await getTableCounts();
  const totalRows = counts.reduce((s, c) => s + c.count, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-violet-400" />
          <div>
            <CardTitle>Database Statistics</CardTitle>
            <CardDescription>{totalRows.toLocaleString()} total rows across all tables</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Table</TableHead>
              <TableHead className="text-right">Row Count</TableHead>
              <TableHead className="text-right">% of Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {counts
              .sort((a, b) => b.count - a.count)
              .map((t) => (
                <TableRow key={t.table}>
                  <TableCell className="font-mono text-sm text-white">{t.table}</TableCell>
                  <TableCell className="text-right font-medium">{t.count.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-zinc-500">
                    {totalRows > 0 ? ((t.count / totalRows) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function AdminSystemPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">System</h1>
        <p className="text-zinc-400 mt-1">Webhook delivery, cron jobs, and database health</p>
      </div>

      <Suspense fallback={<StatsGridSkeleton count={4} />}>
        <WebhookStats />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<TableSkeleton rows={3} />}>
          <CronJobStatus />
        </Suspense>
        <Suspense fallback={<TableSkeleton rows={10} />}>
          <DatabaseStats />
        </Suspense>
      </div>
    </div>
  );
}
