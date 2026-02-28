"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { RotateCcw } from "lucide-react";
import { RefundDialog } from "./refund-dialog";

interface Refund {
  id: string;
  amount: number;
  currency: string;
  status: string;
  reason: string | null;
  created_at: string;
}

interface PaymentRefundSectionProps {
  paymentId: string;
  paymentStatus: string;
  paymentAmount: number;
  currency: string;
  initialRefunds: Refund[];
  isTest: boolean;
}

export function PaymentRefundSection({
  paymentId,
  paymentStatus,
  paymentAmount,
  currency,
  initialRefunds,
  isTest,
}: PaymentRefundSectionProps) {
  const router = useRouter();
  const [refunds, setRefunds] = useState<Refund[]>(initialRefunds);
  const [dialogOpen, setDialogOpen] = useState(false);

  const totalRefunded = refunds
    .filter((r) => ["pending", "processing", "completed"].includes(r.status))
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const canRefund =
    ["confirmed", "partially_refunded"].includes(paymentStatus) &&
    totalRefunded < paymentAmount;

  const refreshRefunds = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/internal/refunds/${paymentId}`);
      if (res.ok) {
        const data = await res.json();
        setRefunds(data);
      }
    } catch {
      // Ignore
    }
    router.refresh();
  }, [paymentId, router]);

  return (
    <>
      {/* Refund Action Card */}
      {canRefund && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-zinc-400" />
                Issue Refund
              </CardTitle>
              {isTest && (
                <Badge
                  className="bg-amber-500/10 text-amber-400 border-amber-500/30"
                  variant="outline"
                >
                  Test
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">
                  {totalRefunded > 0
                    ? `${formatCurrency(paymentAmount - totalRefunded, currency)} remaining of ${formatCurrency(paymentAmount, currency)}`
                    : `Full amount: ${formatCurrency(paymentAmount, currency)}`}
                </p>
              </div>
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Refund
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refund History */}
      {refunds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Refund History</span>
              <span className="text-sm font-normal text-zinc-400">
                {formatCurrency(totalRefunded, currency)} of{" "}
                {formatCurrency(paymentAmount, currency)} refunded
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-12 gap-4 pb-2 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              <div className="col-span-3">Date</div>
              <div className="col-span-3">Amount</div>
              <div className="col-span-4">Reason</div>
              <div className="col-span-2 text-right">Status</div>
            </div>

            <div className="divide-y divide-zinc-800/50">
              {refunds.map((refund) => (
                <div
                  key={refund.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 py-3 items-center"
                >
                  <div className="col-span-3 text-sm text-zinc-400">
                    {formatDate(refund.created_at)}
                  </div>
                  <div className="col-span-3 text-sm font-medium text-white">
                    {formatCurrency(Number(refund.amount), refund.currency)}
                  </div>
                  <div className="col-span-4 text-sm text-zinc-400 truncate">
                    {refund.reason || "--"}
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
            </div>
          </CardContent>
        </Card>
      )}

      <RefundDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        paymentId={paymentId}
        originalAmount={paymentAmount}
        totalRefunded={totalRefunded}
        currency={currency}
        onRefunded={refreshRefunds}
      />
    </>
  );
}
