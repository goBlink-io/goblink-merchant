"use client";

import { useState } from "react";
import {
  Check,
  Download,
  Share2,
  ExternalLink,
  Copy,
  Shield,
} from "lucide-react";
import { getExplorerTxUrl } from "@/lib/explorer";
import { formatCurrency, formatDate, truncateAddress } from "@/lib/utils";

interface PaymentReceiptProps {
  payment: {
    id: string;
    amount: number;
    currency: string;
    orderId: string | null;
    confirmedAt: string | null;
    createdAt: string;
    sendTxHash: string | null;
    fulfillmentTxHash: string | null;
    customerWallet: string | null;
    customerChain: string | null;
    isTest?: boolean;
  };
  merchant: {
    businessName: string;
    logoUrl: string | null;
    brandColor: string | null;
    settlementToken: string | null;
    settlementChain: string | null;
  } | null;
}

export default function PaymentReceipt({ payment, merchant }: PaymentReceiptProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const chain = payment.customerChain || merchant?.settlementChain;
  const explorerUrl =
    chain && payment.fulfillmentTxHash
      ? getExplorerTxUrl(chain, payment.fulfillmentTxHash)
      : null;

  const paymentUrl = typeof window !== "undefined"
    ? window.location.href
    : "";

  const handleDownload = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareData = {
      title: `Payment Receipt — ${merchant?.businessName || "goBlink"}`,
      text: `Payment of ${formatCurrency(payment.amount, payment.currency)} confirmed`,
      url: paymentUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or share failed — fall back to copy
      }
    }

    // Fallback: copy link
    await navigator.clipboard.writeText(paymentUrl);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  const copyTxHash = async () => {
    if (!payment.fulfillmentTxHash) return;
    await navigator.clipboard.writeText(payment.fulfillmentTxHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 print:text-black" id="payment-receipt">
      {/* Receipt header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {merchant?.logoUrl ? (
            <img
              src={merchant.logoUrl}
              alt={merchant.businessName}
              className="h-8 w-8 rounded-lg object-cover"
            />
          ) : (
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{
                background: merchant?.brandColor || "linear-gradient(135deg, #2563EB, #7C3AED)",
              }}
            >
              {merchant?.businessName?.charAt(0).toUpperCase() || "G"}
            </div>
          )}
          <span className="text-sm font-medium text-zinc-200 print:text-black">
            {merchant?.businessName || "goBlink Merchant"}
          </span>
        </div>
        <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 print:text-emerald-700">
          <Check className="h-3 w-3" />
          Paid
        </span>
      </div>

      {/* Amount */}
      <div className="text-center py-3 border-t border-b border-zinc-700/50 print:border-zinc-300">
        <p className="text-2xl font-bold text-zinc-50 print:text-black">
          {formatCurrency(payment.amount, payment.currency)}
        </p>
        <p className="text-xs text-zinc-500 mt-1 print:text-zinc-600">
          {payment.confirmedAt
            ? formatDate(payment.confirmedAt)
            : formatDate(payment.createdAt)}
        </p>
      </div>

      {/* Receipt details */}
      <div className="space-y-2.5 text-sm">
        {payment.orderId && (
          <div className="flex justify-between">
            <span className="text-zinc-400 print:text-zinc-600">Order ID</span>
            <span className="text-zinc-200 font-mono text-xs print:text-black">
              {payment.orderId}
            </span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-zinc-400 print:text-zinc-600">Payment ID</span>
          <span className="text-zinc-200 font-mono text-xs print:text-black">
            {truncateAddress(payment.id, 8)}
          </span>
        </div>

        {chain && (
          <div className="flex justify-between">
            <span className="text-zinc-400 print:text-zinc-600">Network</span>
            <span className="text-zinc-200 capitalize print:text-black">{chain}</span>
          </div>
        )}

        {merchant?.settlementToken && (
          <div className="flex justify-between">
            <span className="text-zinc-400 print:text-zinc-600">Settlement token</span>
            <span className="text-zinc-200 print:text-black">{merchant.settlementToken}</span>
          </div>
        )}

        {payment.fulfillmentTxHash && (
          <div className="space-y-1">
            <span className="text-zinc-400 text-xs print:text-zinc-600">Transaction</span>
            <div className="flex items-center gap-1.5">
              {explorerUrl ? (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-blue-400 hover:text-blue-300 break-all inline-flex items-center gap-1 print:text-blue-700"
                >
                  {truncateAddress(payment.fulfillmentTxHash, 12)}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <span className="text-xs font-mono text-zinc-300 break-all print:text-black">
                  {truncateAddress(payment.fulfillmentTxHash, 12)}
                </span>
              )}
              <button
                onClick={copyTxHash}
                className="shrink-0 p-1 rounded hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors print:hidden"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Test mode notice */}
      {payment.isTest && (
        <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-xs text-amber-400 text-center print:text-amber-700">
            Test payment — no real funds transferred
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 print:hidden">
        <button
          onClick={handleDownload}
          className="flex-1 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Print Receipt
        </button>
        <button
          onClick={handleShare}
          className="flex-1 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1.5"
        >
          {shared ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              Copied!
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5" />
              Share
            </>
          )}
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-zinc-600">
        <Shield className="h-3 w-3" />
        <span>Powered by</span>
        <span className="font-semibold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent print:text-blue-700">
          goBlink
        </span>
      </div>
    </div>
  );
}
