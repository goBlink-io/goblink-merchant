import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/admin/loading";
import { getMerchantDetail } from "@/lib/admin/queries";
import { formatCurrency, formatDate, getStatusColor, truncateAddress } from "@/lib/utils";
import { SuspendButton } from "./suspend-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function MerchantDetailContent({ id }: { id: string }) {
  const merchant = await getMerchantDetail(id);
  if (!merchant) notFound();

  const totalVolume = merchant.payments
    .filter((p) => p.status === "confirmed")
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Profile */}
      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="flex-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{merchant.business_name}</CardTitle>
                <CardDescription>{merchant.email}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {merchant.suspended_at ? (
                  <Badge variant="destructive">Suspended</Badge>
                ) : (
                  <Badge variant="success">Active</Badge>
                )}
                <SuspendButton
                  merchantId={merchant.id}
                  isSuspended={!!merchant.suspended_at}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-zinc-500">Country</dt>
                <dd className="text-white">{merchant.country || "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Currency</dt>
                <dd className="text-white">{merchant.currency}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Timezone</dt>
                <dd className="text-white">{merchant.timezone || "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Joined</dt>
                <dd className="text-white">{formatDate(merchant.created_at)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-zinc-500">Wallet Address</dt>
                <dd className="text-white font-mono text-xs break-all">
                  {merchant.wallet_address || "Not configured"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Settlement</dt>
                <dd className="text-white">
                  {merchant.settlement_token ?? "—"} on {merchant.settlement_chain ?? "—"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:w-72">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Total Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalVolume)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Total Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{merchant.payments.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">API Keys</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{merchant.api_key_count}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Webhook Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Endpoints</CardTitle>
          <CardDescription>{merchant.webhook_endpoints.length} endpoints configured</CardDescription>
        </CardHeader>
        <CardContent>
          {merchant.webhook_endpoints.length === 0 ? (
            <p className="text-zinc-500 text-center py-4">No webhook endpoints</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchant.webhook_endpoints.map((ep) => (
                  <TableRow key={ep.id}>
                    <TableCell className="font-mono text-xs max-w-xs truncate">{ep.url}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {ep.events.map((e) => (
                          <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ep.is_active ? "success" : "secondary"}>
                        {ep.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-500 text-xs">{formatDate(ep.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>Last 50 payments for this merchant</CardDescription>
        </CardHeader>
        <CardContent>
          {merchant.payments.length === 0 ? (
            <p className="text-zinc-500 text-center py-4">No payments</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Chain</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchant.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">{p.external_order_id || "—"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(p.amount), p.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(p.status)} variant="outline">{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{p.crypto_chain || "—"}</TableCell>
                    <TableCell className="text-xs">{p.crypto_token || "—"}</TableCell>
                    <TableCell className="text-zinc-500 text-xs">{formatDate(p.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function MerchantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin/merchants" className="text-zinc-400 hover:text-white text-sm">
          Merchants
        </Link>
        <span className="text-zinc-600">/</span>
        <span className="text-white text-sm">Detail</span>
      </div>

      <Suspense fallback={<TableSkeleton rows={5} />}>
        <MerchantDetailContent id={id} />
      </Suspense>
    </div>
  );
}
