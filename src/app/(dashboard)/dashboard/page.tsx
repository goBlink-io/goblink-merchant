import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
import { DollarSign, TrendingUp, Clock, CreditCard } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/login");

  // Get today's start in UTC
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Fetch recent payments
  const { data: recentPayments } = await supabase
    .from("payments")
    .select("*")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch today's confirmed payments for revenue
  const { data: todayPayments } = await supabase
    .from("payments")
    .select("net_amount")
    .eq("merchant_id", merchant.id)
    .eq("status", "confirmed")
    .gte("confirmed_at", todayStart.toISOString());

  // Fetch pending payments count
  const { count: pendingCount } = await supabase
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("merchant_id", merchant.id)
    .in("status", ["pending", "processing"]);

  // Fetch total confirmed payments
  const { data: allConfirmed } = await supabase
    .from("payments")
    .select("net_amount")
    .eq("merchant_id", merchant.id)
    .eq("status", "confirmed");

  const todayRevenue = todayPayments?.reduce(
    (sum, p) => sum + (Number(p.net_amount) || 0),
    0
  ) ?? 0;

  const totalBalance = allConfirmed?.reduce(
    (sum, p) => sum + (Number(p.net_amount) || 0),
    0
  ) ?? 0;

  const totalPayments = allConfirmed?.length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {merchant.business_name}
        </h1>
        <p className="text-zinc-400 mt-1">
          Here&apos;s what&apos;s happening with your payments.
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
              {formatCurrency(totalBalance, merchant.currency)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {merchant.settlement_token} on {merchant.settlement_chain}
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
              {formatCurrency(todayRevenue, merchant.currency)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
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
              {pendingCount ?? 0}
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
              {totalPayments}
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
          {!recentPayments || recentPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-300">
                No payments yet
              </h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
                Payments will appear here once your first customer pays.
                Set up your API key in Settings to get started.
              </p>
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center mt-4 text-sm text-blue-400 hover:text-blue-300"
              >
                Go to Settings
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {recentPayments.map((payment) => (
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
                    <Badge
                      className={getStatusColor(payment.status)}
                      variant="outline"
                    >
                      {payment.status}
                    </Badge>
                    <span className="text-sm font-medium text-white">
                      {formatCurrency(Number(payment.amount), payment.currency)}
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
