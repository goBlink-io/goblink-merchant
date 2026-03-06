"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import {
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useTestModeContext } from "@/contexts/TestModeContext";

interface Refund {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  reason: string | null;
  created_at: string;
}

interface RefundsContentProps {
  initialRefunds: Refund[];
  currency: string;
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

export function RefundsContent({
  initialRefunds,
  currency,
}: RefundsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isTestMode } = useTestModeContext();
  const [refunds, setRefunds] = useState<Refund[]>(initialRefunds);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "all"
  );
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || ""
  );
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(perPage));
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (isTestMode) params.set("is_test", "true");

    try {
      const res = await fetch(`/api/v1/internal/refunds/list?${params}`);
      if (res.ok) {
        const json = await res.json();
        setRefunds(json.data ?? []);
        setTotalCount(json.totalCount ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch, isTestMode]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch, isTestMode]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (searchQuery) params.set("search", searchQuery);
    if (isTestMode) params.set("is_test", "true");
    const qs = params.toString();
    router.replace(`/dashboard/refunds${qs ? `?${qs}` : ""}`);
  }, [statusFilter, searchQuery, isTestMode, router]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search by payment ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_TABS.map((tab) => (
              <SelectItem key={tab.value} value={tab.value}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Refunds list */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : refunds.length === 0 ? (
            <div className="text-center py-16">
              <RotateCcw className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-300">No refunds</h3>
              <p className="text-sm text-zinc-500 mt-1">
                {statusFilter !== "all"
                  ? "Try adjusting your filter."
                  : "Refunds you issue will appear here."}
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                <div className="col-span-3">Date</div>
                <div className="col-span-3">Payment</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-2">Reason</div>
                <div className="col-span-2 text-right">Status</div>
              </div>

              {/* Rows */}
              {refunds.map((refund) => (
                <div
                  key={refund.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors items-center"
                >
                  <div className="col-span-3">
                    <p className="text-sm text-zinc-400">
                      {formatDate(refund.created_at)}
                    </p>
                  </div>
                  <div className="col-span-3">
                    <Link
                      href={`/dashboard/payments/${refund.payment_id}`}
                      className="text-sm font-medium text-blue-400 hover:text-blue-300 font-mono"
                    >
                      {refund.payment_id.slice(0, 8)}...
                    </Link>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-white">
                      {formatCurrency(Number(refund.amount), refund.currency)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-zinc-400 truncate">
                      {refund.reason || "--"}
                    </p>
                  </div>
                  <div className="col-span-2 text-right">
                    <Badge
                      className={getStatusColor(refund.status)}
                      variant="outline"
                    >
                      {refund.status}
                    </Badge>
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
          <p className="text-xs text-zinc-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-8"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
