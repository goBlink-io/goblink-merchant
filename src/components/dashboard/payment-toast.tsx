"use client";

import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface PaymentToastOptions {
  amount: number;
  currency: string;
  token?: string;
}

export function showPaymentToast({ amount, currency, token }: PaymentToastOptions) {
  toast.custom(
    () => (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 shadow-lg flex items-center gap-3 min-w-[280px]">
        <span className="text-lg leading-none">💰</span>
        <div>
          <p className="text-xs text-zinc-400">New payment</p>
          <p className="text-sm font-semibold text-green-400">
            {formatCurrency(amount, currency)}{" "}
            {token || currency}
          </p>
        </div>
      </div>
    ),
    { duration: 5000 }
  );
}
