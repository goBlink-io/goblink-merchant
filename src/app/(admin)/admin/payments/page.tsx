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
import { getGlobalPayments } from "@/lib/admin/queries";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function PaymentsTable({
  searchParams,
}: {
  searchParams: { status?: string; merchant?: string; chain?: string; token?: string; search?: string; page?: string; is_test?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  const { data: payments, total } = await getGlobalPayments({
    status: searchParams.status,
    merchantId: searchParams.merchant,
    chain: searchParams.chain,
    token: searchParams.token,
    search: searchParams.search,
    isTest: searchParams.is_test,
    limit,
    offset,
  });

  // Count test payments separately
  const testCount = payments.filter((p) => p.is_test).length;

  const totalPages = Math.ceil(total / limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Payments</CardTitle>
        <CardDescription>
          {total} total payments across all merchants
          {searchParams.status ? ` (filtered: ${searchParams.status})` : ""}
          {testCount > 0 ? ` · ${testCount} test` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-center text-zinc-500 py-8">No payments found</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Chain</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Confirmed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-sm">{p.merchant_name}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(p.amount), p.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(p.status)} variant="outline">{p.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.is_test ? (
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]" variant="outline">Test</Badge>
                      ) : (
                        <span className="text-xs text-zinc-500">Live</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{p.crypto_chain || "—"}</TableCell>
                    <TableCell className="text-xs">{p.crypto_token || "—"}</TableCell>
                    <TableCell className="text-zinc-500 text-xs">{formatDate(p.created_at)}</TableCell>
                    <TableCell className="text-zinc-500 text-xs">
                      {p.confirmed_at ? formatDate(p.confirmed_at) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <a
                      href={`/admin/payments?page=${page - 1}${searchParams.status ? `&status=${searchParams.status}` : ""}${searchParams.search ? `&search=${searchParams.search}` : ""}`}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Previous
                    </a>
                  )}
                  {page < totalPages && (
                    <a
                      href={`/admin/payments?page=${page + 1}${searchParams.status ? `&status=${searchParams.status}` : ""}${searchParams.search ? `&search=${searchParams.search}` : ""}`}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Next
                    </a>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; merchant?: string; chain?: string; token?: string; search?: string; page?: string; is_test?: string }>;
}) {
  const params = await searchParams;
  const statuses = ["pending", "processing", "confirmed", "failed", "expired", "refunded"];

  function buildHref(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { ...params, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== "") p.set(k, v);
    }
    p.delete("page");
    return `/admin/payments?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Payments</h1>
        <p className="text-zinc-400 mt-1">All payments across the platform</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <a
          href={buildHref({ status: undefined })}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            !params.status
              ? "bg-violet-600/20 text-violet-400 border border-violet-500/30"
              : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          All
        </a>
        {statuses.map((s) => (
          <a
            key={s}
            href={buildHref({ status: s })}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
              params.status === s
                ? "bg-violet-600/20 text-violet-400 border border-violet-500/30"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {s}
          </a>
        ))}
        <span className="w-px bg-zinc-700 mx-1" />
        <a
          href={buildHref({ is_test: undefined })}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            !params.is_test
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
              : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          All modes
        </a>
        <a
          href={buildHref({ is_test: "false" })}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            params.is_test === "false"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
              : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          Live only
        </a>
        <a
          href={buildHref({ is_test: "true" })}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            params.is_test === "true"
              ? "bg-amber-600/20 text-amber-400 border border-amber-500/30"
              : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          Test only
        </a>
      </div>

      <Suspense fallback={<TableSkeleton rows={15} />}>
        <PaymentsTable searchParams={params} />
      </Suspense>
    </div>
  );
}
