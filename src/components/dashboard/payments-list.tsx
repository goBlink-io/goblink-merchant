"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, CreditCard, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import { SharePaymentDialog } from "@/components/dashboard/share-payment-dialog";
import { useTestModeContext } from "@/contexts/TestModeContext";

interface Payment {
  id: string;
  external_order_id: string | null;
  amount: number;
  currency: string;
  crypto_amount: string | null;
  crypto_token: string | null;
  crypto_chain: string | null;
  status: string;
  customer_wallet: string | null;
  send_tx_hash: string | null;
  payment_url: string | null;
  created_at: string;
  is_test?: boolean;
}

interface PaymentsListProps {
  payments: Payment[];
  totalCount: number;
  currentPage: number;
  perPage: number;
  currency: string;
  currentStatus: string;
  currentSearch: string;
}

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "confirmed", label: "Confirmed" },
  { value: "failed", label: "Failed" },
  { value: "expired", label: "Expired" },
  { value: "refunded", label: "Refunded" },
];

export function PaymentsList({
  payments,
  totalCount,
  currentPage,
  perPage,
  currency,
  currentStatus,
  currentSearch,
}: PaymentsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentSearch);
  const [sharePayment, setSharePayment] = useState<Payment | null>(null);
  const { isTestMode } = useTestModeContext();

  // Sync test mode context with URL param
  useEffect(() => {
    const currentIsTest = searchParams.get("is_test") === "true";
    if (currentIsTest !== isTestMode) {
      const params = new URLSearchParams(searchParams.toString());
      if (isTestMode) {
        params.set("is_test", "true");
      } else {
        params.delete("is_test");
      }
      params.delete("page");
      router.push(`/dashboard/payments?${params.toString()}`);
    }
  }, [isTestMode, searchParams, router]);

  const totalPages = Math.ceil(totalCount / perPage);

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== "all" && value !== "") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    // Reset page when filtering
    if ("status" in updates || "search" in updates) {
      params.delete("page");
    }
    router.push(`/dashboard/payments?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ search });
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search by order ID or tx hash..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </form>
        <Select
          value={currentStatus}
          onValueChange={(value) => updateParams({ status: value })}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="text-center py-16">
              <CreditCard className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-300">No payments found</h3>
              <p className="text-sm text-zinc-500 mt-1">
                {currentSearch || currentStatus !== "all"
                  ? "Try adjusting your filters."
                  : "Payments will appear here once customers start paying."}
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                <div className="col-span-3">Order</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-2">Crypto</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-1"></div>
              </div>

              {/* Rows */}
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors items-center"
                >
                  <Link
                    href={`/dashboard/payments/${payment.id}`}
                    className="col-span-3"
                  >
                    <p className="text-sm font-medium text-white truncate">
                      {payment.external_order_id || `#${payment.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-zinc-500 truncate md:hidden">
                      {formatDate(payment.created_at)}
                    </p>
                  </Link>
                  <Link href={`/dashboard/payments/${payment.id}`} className="col-span-2">
                    <span className="text-sm font-medium text-white">
                      {formatCurrency(Number(payment.amount), payment.currency)}
                    </span>
                  </Link>
                  <Link href={`/dashboard/payments/${payment.id}`} className="col-span-2">
                    {payment.crypto_amount ? (
                      <span className="text-sm text-zinc-400">
                        {payment.crypto_amount} {payment.crypto_token}
                      </span>
                    ) : (
                      <span className="text-sm text-zinc-600">--</span>
                    )}
                  </Link>
                  <div className="col-span-2 flex items-center gap-1.5">
                    {payment.is_test && (
                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]" variant="outline">
                        Test
                      </Badge>
                    )}
                    <Badge className={getStatusColor(payment.status)} variant="outline">
                      {payment.status}
                    </Badge>
                  </div>
                  <div className="col-span-2 hidden md:block">
                    <span className="text-sm text-zinc-400">
                      {formatDate(payment.created_at)}
                    </span>
                  </div>
                  <div className="col-span-1 hidden md:flex justify-end">
                    {(payment.status === "pending" || payment.status === "processing") &&
                      payment.payment_url && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSharePayment(payment);
                          }}
                          className="p-1.5 rounded-md text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
                          title="Share payment link"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Showing {(currentPage - 1) * perPage + 1}–
            {Math.min(currentPage * perPage, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => updateParams({ page: String(currentPage - 1) })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-zinc-400">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => updateParams({ page: String(currentPage + 1) })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Share dialog */}
      {sharePayment && sharePayment.payment_url && (
        <SharePaymentDialog
          payment={{
            id: sharePayment.id,
            amount: Number(sharePayment.amount),
            currency: sharePayment.currency,
            status: sharePayment.status,
            payment_url: sharePayment.payment_url,
            external_order_id: sharePayment.external_order_id,
          }}
          open={!!sharePayment}
          onOpenChange={(open) => {
            if (!open) setSharePayment(null);
          }}
        />
      )}
    </div>
  );
}
