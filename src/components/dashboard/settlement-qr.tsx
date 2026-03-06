"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";

interface SettlementQRProps {
  depositAddress: string;
}

export function SettlementQR({ depositAddress }: SettlementQRProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white p-3 rounded-xl">
        <QRCodeSVG value={depositAddress} size={160} level="M" />
      </div>
      <div className="w-full">
        <p className="text-xs text-zinc-500 mb-1 text-center">Deposit Address</p>
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-xs font-mono text-zinc-300 break-all"
        >
          <span className="truncate">{depositAddress}</span>
          {copied ? (
            <Check className="h-3 w-3 shrink-0 text-emerald-400" />
          ) : (
            <Copy className="h-3 w-3 shrink-0 text-zinc-500" />
          )}
        </button>
      </div>
    </div>
  );
}
