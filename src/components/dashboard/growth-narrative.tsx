"use client";

import { TrendingUp, TrendingDown, Clock, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface WeeklyStats {
  thisWeekRevenue: number;
  lastWeekRevenue: number;
  thisWeekCount: number;
  lastWeekCount: number;
  monthPaymentCount: number;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function ChangeIndicator({ current, previous, label }: { current: number; previous: number; label: string }) {
  const change = pctChange(current, previous);
  if (change === null) return <span className="text-xs text-zinc-500">{label}</span>;
  const isUp = change >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isUp ? "text-emerald-400" : "text-amber-400"}`}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? "+" : ""}{change}% {label}
    </span>
  );
}

export function GrowthNarrative({
  stats,
  displayCurrency,
  exchangeRate,
}: {
  stats: WeeklyStats;
  displayCurrency: string;
  exchangeRate: number;
}) {
  const { thisWeekRevenue, lastWeekRevenue, thisWeekCount, lastWeekCount, monthPaymentCount } = stats;

  // Don't show if merchant has zero activity
  if (thisWeekCount === 0 && lastWeekCount === 0) return null;

  const isBestWeek = thisWeekRevenue > 0 && thisWeekRevenue > lastWeekRevenue;
  const isDown = thisWeekRevenue < lastWeekRevenue;
  const timeSavedDays = monthPaymentCount * 2; // industry avg: 2 days settlement

  const fmt = (usd: number) =>
    displayCurrency === "USD" || exchangeRate === 1
      ? formatCurrency(usd, "USD")
      : formatCurrency(usd * exchangeRate, displayCurrency);

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-zinc-100">
          Your Week
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Revenue */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">Revenue</p>
            <p className="text-lg font-bold text-white">{fmt(thisWeekRevenue)}</p>
          </div>
          <div className="text-right">
            <ChangeIndicator current={thisWeekRevenue} previous={lastWeekRevenue} label="vs last week" />
            {isBestWeek && (
              <p className="text-xs text-emerald-400 mt-0.5">Best week yet!</p>
            )}
          </div>
        </div>

        {/* Payment count */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">Payments</p>
            <p className="text-lg font-bold text-white">{thisWeekCount}</p>
          </div>
          <ChangeIndicator current={thisWeekCount} previous={lastWeekCount} label="vs last week" />
        </div>

        {/* Settlement time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-500" />
            <p className="text-sm text-zinc-400">Avg settlement</p>
          </div>
          <p className="text-sm font-medium text-zinc-200">Under 60 seconds</p>
        </div>

        {/* Time saved */}
        {timeSavedDays > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-400" />
              <p className="text-sm text-zinc-400">Time saved this month</p>
            </div>
            <p className="text-sm font-bold text-blue-400">{timeSavedDays} days</p>
          </div>
        )}

        {/* Encouragement */}
        <p className="text-xs text-zinc-500 pt-1">
          {isDown
            ? "Every business has quieter weeks — you\u2019ve got this."
            : thisWeekCount > 0
              ? "Great momentum! Keep it going."
              : "Your first payments are right around the corner."}
        </p>
      </CardContent>
    </Card>
  );
}
