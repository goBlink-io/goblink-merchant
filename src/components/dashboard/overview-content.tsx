"use client";

import { useTestModeContext } from "@/contexts/TestModeContext";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Clock, CreditCard, Loader2 } from "lucide-react";
import Link from "next/link";

interface OverviewData {
  totalBalance: number;
  todayRevenue: number;
  pendingCount: number;
  totalPayments: number;
  recentPayments: Array<{
    id: string;
    external_order_id: string | null;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    is_test: boolean;
  }>;
  currency: string;
  displayCurrency: string;
  exchangeRate: number;
  settlementToken: string;
  settlementChain: string;
  businessName: string;
}

function formatConverted(amountUsd: number, displayCurrency: string, exchangeRate: number): string {
  if (displayCurrency === "USD" || exchangeRate === 1) {
    return formatCurrency(amountUsd, "USD");
  }
  return formatCurrency(amountUsd * exchangeRate, displayCurrency);
}

function UsdSecondary({ amountUsd, displayCurrency }: { amountUsd: number; displayCurrency: string }) {
  if (displayCurrency === "USD") return null;
  return (
    <span className="text-xs text-zinc-500 ml-1">
      ({formatCurrency(amountUsd, "USD")})
    </span>
  );
}

export function OverviewContent({ data }: { data: OverviewData }) {
  const { isTestMode } = useTestModeContext();
  const [filtered, setFiltered] = useState<OverviewData>(data);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Re-fetch with test filter
    setLoading(true);
    fetch(`/api/v1/internal/overview?is_test=${isTestMode}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d) setFiltered(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isTestMode]);

  const dc = filtered.displayCurrency || "USD";
  const rate = filtered.exchangeRate || 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {filtered.businessName}
        </h1>
        <p className="text-zinc-400 mt-1">
          Accept crypto from any chain. Settle instantly to your wallet. No holds, no chargebacks, no middlemen.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Total Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : formatConverted(filtered.totalBalance, dc, rate)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {dc !== "USD" && !loading && <>{formatCurrency(filtered.totalBalance, "USD")} &middot; </>}
              {filtered.settlementToken} on {filtered.settlementChain}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Today&apos;s Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : formatConverted(filtered.todayRevenue, dc, rate)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {dc !== "USD" && !loading && <>{formatCurrency(filtered.todayRevenue, "USD")} &middot; </>}
              Confirmed payments today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (filtered.pendingCount ?? 0)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Payments in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Total Payments
            </CardTitle>
            <CreditCard className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : filtered.totalPayments}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              All time confirmed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>Your latest transactions</CardDescription>
            </div>
            <Link
              href="/dashboard/payments"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          ) : !filtered.recentPayments || filtered.recentPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-300">
                No {isTestMode ? "test " : ""}payments yet
              </h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
                {isTestMode
                  ? "Create a test payment using a gb_test_ API key to see it here."
                  : "Payments will appear here once your first customer pays."}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.recentPayments.map((payment) => (
                <Link
                  key={payment.id}
                  href={`/dashboard/payments/${payment.id}`}
                  className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-zinc-800/50 transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {payment.external_order_id || payment.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(payment.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {payment.is_test && (
                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]" variant="outline">
                        Test
                      </Badge>
                    )}
                    <Badge
                      className={getStatusColor(payment.status)}
                      variant="outline"
                    >
                      {payment.status}
                    </Badge>
                    <span className="text-sm font-medium text-white">
                      {formatConverted(Number(payment.amount), dc, rate)}
                      <UsdSecondary amountUsd={Number(payment.amount)} displayCurrency={dc} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
