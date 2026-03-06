"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  originalAmount: number;
  totalRefunded: number;
  currency: string;
  onRefunded: () => void;
}

export function RefundDialog({
  open,
  onOpenChange,
  paymentId,
  originalAmount,
  totalRefunded,
  currency,
  onRefunded,
}: RefundDialogProps) {
  const remaining = originalAmount - totalRefunded;
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleFullRefund() {
    setAmount(remaining.toFixed(2));
  }

  async function handleSubmit() {
    const refundAmount = parseFloat(amount);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      toast.error("Please enter a valid refund amount");
      return;
    }
    if (refundAmount > remaining) {
      toast.error(
        `Amount exceeds remaining refundable (${formatCurrency(remaining, currency)})`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/internal/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_id: paymentId,
          amount: refundAmount,
          reason: reason.trim() || undefined,
        }),
      });

      if (res.ok) {
        toast.success(
          `Refund of ${formatCurrency(refundAmount, currency)} issued successfully`
        );
        setAmount("");
        setReason("");
        onOpenChange(false);
        onRefunded();
      } else {
        const err = await res.json();
        toast.error(err?.error?.message || "Failed to issue refund");
      }
    } catch {
      toast.error("Failed to issue refund");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue Refund</DialogTitle>
          <DialogDescription>
            Refund all or part of this payment back to the customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-zinc-800/50 p-3">
              <p className="text-xs text-zinc-500">Original</p>
              <p className="text-sm font-medium text-white">
                {formatCurrency(originalAmount, currency)}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-800/50 p-3">
              <p className="text-xs text-zinc-500">Refunded</p>
              <p className="text-sm font-medium text-white">
                {formatCurrency(totalRefunded, currency)}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-800/50 p-3">
              <p className="text-xs text-zinc-500">Remaining</p>
              <p className="text-sm font-medium text-emerald-400">
                {formatCurrency(remaining, currency)}
              </p>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="refund-amount">Refund Amount</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleFullRefund}
              >
                Full Refund
              </Button>
            </div>
            <Input
              id="refund-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="refund-reason">Reason (optional)</Label>
            <Textarea
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Customer requested refund, duplicate payment, etc."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !amount || parseFloat(amount) <= 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Issue Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
