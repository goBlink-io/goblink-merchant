"use client";

import { useTestModeContext } from "@/contexts/TestModeContext";
import { useEffect, useState, useCallback } from "react";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Clock, CreditCard, Loader2 } from "lucide-react";
import Link from "next/link";
import { QuickStartChecklist } from "@/components/dashboard/quick-start-checklist";
import { GrowthNarrative } from "@/components/dashboard/growth-narrative";
import { useRealtimePayments, type ConnectionStatus, type RealtimePaymentRecord } from "@/hooks/useRealtimePayments";
import { showPaymentToast } from "@/components/dashboard/payment-toast";
import { FirstPaymentModal } from "@/components/dashboard/first-payment-modal";
import { MilestoneBadge } from "@/components/dashboard/milestone-badge";

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
  onboardingChecklist?: {
    account_created: boolean;
    wallet_connected: boolean;
    settlement_configured: boolean;
    first_link_created: boolean;
    test_payment_completed: boolean;
    webhook_configured: boolean;
  } | null;
  firstPaymentCelebrated?: boolean;
  merchantId?: string;
  weeklyStats?: {
    thisWeekRevenue: number;
    lastWeekRevenue: number;
    thisWeekCount: number;
    lastWeekCount: number;
    monthPaymentCount: number;
  };
}

interface NotificationRecord {
  id: string;
  type: string;
  link: string | null;
  read_at: string | null;
}

interface MilestoneRecord {
  milestone_key: string;
  achieved_at: string;
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

function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
        <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
        Live
      </span>
    );
  }
  if (status === "reconnecting") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-yellow-400">
        <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
        Reconnecting
      </span>
    );
  }
  return null;
}

export function OverviewContent({ data }: { data: OverviewData }) {
  const { isTestMode } = useTestModeContext();
  const [filtered, setFiltered] = useState<OverviewData>(data);
  const [loading, setLoading] = useState(false);
  const [firstPaymentNotif, setFirstPaymentNotif] = useState<NotificationRecord | null>(null);
  const [milestones, setMilestones] = useState<MilestoneRecord[]>([]);

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

  // Fetch first_payment notification + milestones
  useEffect(() => {
    fetch("/api/v1/internal/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (!d?.notifications) return;
        const fp = (d.notifications as NotificationRecord[]).find(
          (n) => n.type === "first_payment" && !n.read_at
        );
        if (fp) setFirstPaymentNotif(fp);
      })
      .catch(() => {});

    if (data.merchantId) {
      fetch(`/api/v1/internal/milestones`)
        .then((res) => (res.ok ? res.json() : null))
        .then((d) => {
          if (d?.milestones) setMilestones(d.milestones);
        })
        .catch(() => {});
    }
  }, [data.merchantId]);

  const handleInsert = useCallback(
    (record: RealtimePaymentRecord) => {
      // Only process payments matching current test mode
      if (Boolean(record.is_test) !== isTestMode) return;

      showPaymentToast({
        amount: Number(record.amount),
        currency: record.currency ?? "USD",
        token: record.crypto_token ?? undefined,
      });

      setFiltered((prev) => ({
        ...prev,
        totalPayments: prev.totalPayments + 1,
        todayRevenue: prev.todayRevenue + Number(record.amount),
        pendingCount:
          record.status === "pending" || record.status === "processing"
            ? prev.pendingCount + 1
            : prev.pendingCount,
        recentPayments: [
          {
            id: record.id,
            external_order_id: record.external_order_id ?? null,
            amount: Number(record.amount),
            currency: record.currency ?? "USD",
            status: record.status ?? "pending",
            created_at: record.created_at ?? new Date().toISOString(),
            is_test: Boolean(record.is_test),
          },
          ...prev.recentPayments.slice(0, 7),
        ],
      }));
    },
    [isTestMode]
  );

  const handleUpdate = useCallback(
    (record: RealtimePaymentRecord) => {
      if (Boolean(record.is_test) !== isTestMode) return;

      setFiltered((prev) => ({
        ...prev,
        recentPayments: prev.recentPayments.map((p) =>
          p.id === record.id
            ? { ...p, status: record.status ?? p.status }
            : p
        ),
      }));
    },
    [isTestMode]
  );

  const { connectionStatus } = useRealtimePayments(filtered.merchantId, {
    onInsert: handleInsert,
    onUpdate: handleUpdate,
  });

  const dc = filtered.displayCurrency || "USD";
  const rate = filtered.exchangeRate || 1;

  return (
    <div className="space-y-8">
      {/* First Payment Celebration Modal */}
      {firstPaymentNotif && (
        <FirstPaymentModal
          notificationId={firstPaymentNotif.id}
          paymentLink={firstPaymentNotif.link ?? "/dashboard/payments"}
        />
      )}

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {filtered.businessName}
          </h1>
          <ConnectionIndicator status={connectionStatus} />
        </div>
        <p className="text-zinc-400 mt-1">
          Accept crypto from any chain. Settle instantly to your wallet. No holds, no chargebacks, no middlemen.
        </p>
      </div>

      {/* Quick Start Checklist */}
      {filtered.onboardingChecklist && filtered.merchantId && (
        <QuickStartChecklist
          merchantId={filtered.merchantId}
          checklist={filtered.onboardingChecklist}
          firstPaymentCelebrated={filtered.firstPaymentCelebrated ?? false}
        />
      )}

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

      {/* Milestone Badges */}
      {milestones.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {milestones.slice(0, 3).map((m) => (
            <MilestoneBadge key={m.milestone_key} milestoneKey={m.milestone_key} />
          ))}
        </div>
      )}

      {/* Growth Narrative — Your Week */}
      {filtered.weeklyStats && (
        <GrowthNarrative
          stats={filtered.weeklyStats}
          displayCurrency={dc}
          exchangeRate={rate}
        />
      )}

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
