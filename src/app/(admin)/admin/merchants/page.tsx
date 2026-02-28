import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { getAllMerchants } from "@/lib/admin/queries";
import { formatCurrency, formatDate, truncateAddress } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function MerchantsTable() {
  const merchants = await getAllMerchants();

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Merchants</CardTitle>
        <CardDescription>{merchants.length} total merchants</CardDescription>
      </CardHeader>
      <CardContent>
        {merchants.length === 0 ? (
          <p className="text-center text-zinc-500 py-8">No merchants yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">Payments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchants.map((m) => (
                <TableRow key={m.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/admin/merchants/${m.id}`}
                      className="text-white font-medium hover:text-blue-400"
                    >
                      {m.business_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-zinc-400">{m.email}</TableCell>
                  <TableCell>{m.country}</TableCell>
                  <TableCell>{m.currency}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {m.wallet_address ? truncateAddress(m.wallet_address) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(m.total_volume ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">{m.total_payments ?? 0}</TableCell>
                  <TableCell>
                    {m.suspended_at ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-500 text-xs">
                    {formatDate(m.created_at)}
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

export default function AdminMerchantsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Merchants</h1>
        <p className="text-zinc-400 mt-1">All registered merchants on the platform</p>
      </div>

      <Suspense fallback={<TableSkeleton rows={10} />}>
        <MerchantsTable />
      </Suspense>
    </div>
  );
}
