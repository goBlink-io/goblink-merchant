import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/admin/loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getFailedPayments,
  getStuckPayments,
  getWebhookFailures,
  getMerchantsWithHighFailureRate,
} from "@/lib/admin/queries";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AlertTriangle, Clock, Webhook, Users } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function FailedPaymentsSection() {
  const payments = await getFailedPayments(7);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div>
            <CardTitle>Failed Payments</CardTitle>
            <CardDescription>Last 7 days — {payments.length} failures</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-center text-zinc-500 py-6">No failed payments</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Chain</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.slice(0, 20).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}</TableCell>
                  <TableCell>{p.merchant_name}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(p.amount), p.currency)}
                  </TableCell>
                  <TableCell className="text-xs">{p.crypto_chain || "—"}</TableCell>
                  <TableCell className="text-zinc-500 text-xs">{formatDate(p.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

async function StuckPaymentsSection() {
  const payments = await getStuckPayments();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-400" />
          <div>
            <CardTitle>Stuck Payments</CardTitle>
            <CardDescription>Processing for &gt;1 hour — {payments.length} stuck</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-center text-zinc-500 py-6">No stuck payments</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Chain</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}</TableCell>
                  <TableCell>{p.merchant_name}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(p.amount), p.currency)}
                  </TableCell>
                  <TableCell className="text-xs">{p.crypto_chain || "—"}</TableCell>
                  <TableCell className="text-zinc-500 text-xs">{formatDate(p.updated_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

async function WebhookFailuresSection() {
  const failures = await getWebhookFailures(30);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-orange-400" />
          <div>
            <CardTitle>Webhook Delivery Failures</CardTitle>
            <CardDescription>{failures.length} undelivered webhooks</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {failures.length === 0 ? (
          <p className="text-center text-zinc-500 py-6">No failures</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Attempt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {failures.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{f.event}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{f.merchant_name}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[200px] truncate">
                    {f.endpoint_url}
                  </TableCell>
                  <TableCell>{f.attempt}</TableCell>
                  <TableCell>
                    <Badge variant="destructive" className="text-xs">
                      {f.response_status ?? "No response"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-500 text-xs">{formatDate(f.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

async function HighFailureRateMerchants() {
  const merchants = await getMerchantsWithHighFailureRate(30, 20);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-red-400" />
          <div>
            <CardTitle>High Failure Rate Merchants</CardTitle>
            <CardDescription>&gt;20% failure rate in last 30 days (min 5 payments)</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {merchants.length === 0 ? (
          <p className="text-center text-zinc-500 py-6">No merchants with high failure rates</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merchant</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead className="text-right">Failure Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchants.map((m) => (
                <TableRow key={m.merchant_id}>
                  <TableCell>
                    <Link
                      href={`/admin/merchants/${m.merchant_id}`}
                      className="text-white hover:text-blue-400"
                    >
                      {m.business_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{m.total_payments}</TableCell>
                  <TableCell className="text-right text-red-400">{m.failed_payments}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="destructive">{m.failure_rate.toFixed(1)}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminIssuesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Issues</h1>
        <p className="text-zinc-400 mt-1">Payment failures, stuck transactions, and webhook problems</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<TableSkeleton rows={5} />}>
          <FailedPaymentsSection />
        </Suspense>
        <Suspense fallback={<TableSkeleton rows={5} />}>
          <StuckPaymentsSection />
        </Suspense>
      </div>

      <Suspense fallback={<TableSkeleton rows={5} />}>
        <WebhookFailuresSection />
      </Suspense>

      <Suspense fallback={<TableSkeleton rows={5} />}>
        <HighFailureRateMerchants />
      </Suspense>
    </div>
  );
}
