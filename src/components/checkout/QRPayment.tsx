"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Clock, QrCode, Wallet } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface QRPaymentProps {
  depositAddress: string;
  amount: string; // raw amount in minor units
  amountDisplay: string; // formatted display amount (e.g. "124.50 USDC")
  fiatAmount: number;
  fiatCurrency: string;
  tokenSymbol: string;
  tokenAddress?: string; // ERC-20 contract address (if not native)
  tokenDecimals?: number;
  isEvm?: boolean;
  expiresAt?: string;
}

export default function QRPayment({
  depositAddress,
  amount,
  amountDisplay,
  fiatAmount,
  fiatCurrency,
  tokenSymbol,
  tokenAddress,
  tokenDecimals,
  isEvm,
  expiresAt,
}: QRPaymentProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  // QR expiry countdown
  useEffect(() => {
    if (!expiresAt) return;

    function update() {
      const diff = new Date(expiresAt!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    }

    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build QR value: EIP-681 for EVM, plain address otherwise
  const qrValue = buildQrValue({
    depositAddress,
    amount,
    tokenAddress,
    tokenDecimals,
    isEvm,
  });

  return (
    <div className="space-y-4">
      {/* QR code */}
      <div className="flex flex-col items-center">
        <div className="bg-white p-4 rounded-2xl">
          <QRCodeSVG
            value={qrValue}
            size={200}
            level="M"
            includeMargin={false}
          />
        </div>

        <p className="mt-3 text-sm font-medium text-zinc-200">
          {amountDisplay}
        </p>
        <p className="text-xs text-zinc-500">
          {formatCurrency(fiatAmount, fiatCurrency)}
        </p>
      </div>

      {/* Timer */}
      {timeLeft && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500">
          <Clock className="h-3.5 w-3.5" />
          <span>{timeLeft === "Expired" ? "Quote expired" : `Expires in ${timeLeft}`}</span>
        </div>
      )}

      {/* Deposit address + copy */}
      <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
        <p className="text-xs text-zinc-500 mb-1">Deposit address</p>
        <div className="flex items-center gap-2">
          <p className="text-xs font-mono text-zinc-200 break-all flex-1">
            {depositAddress}
          </p>
          <button
            onClick={copyAddress}
            className="shrink-0 p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-500 text-center">
        Send exactly <span className="text-zinc-300">{amountDisplay}</span> of{" "}
        <span className="text-zinc-300">{tokenSymbol}</span> to the address above.
      </p>
    </div>
  );
}

/** Tab switcher only — for rendering above the wallet flow */
export function QRTabSwitcher({
  activeTab,
  onTabChange,
}: {
  activeTab: "wallet" | "qr";
  onTabChange: (tab: "wallet" | "qr") => void;
}) {
  return (
    <div className="flex rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-0.5">
      <button
        onClick={() => onTabChange("wallet")}
        className={cn(
          "flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
          activeTab === "wallet"
            ? "bg-zinc-700 text-zinc-100"
            : "text-zinc-500 hover:text-zinc-300"
        )}
      >
        <Wallet className="h-3.5 w-3.5" />
        Pay with wallet
      </button>
      <button
        onClick={() => onTabChange("qr")}
        className={cn(
          "flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
          activeTab === "qr"
            ? "bg-zinc-700 text-zinc-100"
            : "text-zinc-500 hover:text-zinc-300"
        )}
      >
        <QrCode className="h-3.5 w-3.5" />
        Scan QR code
      </button>
    </div>
  );
}

// --- Helpers ---

function buildQrValue(opts: {
  depositAddress: string;
  amount: string;
  tokenAddress?: string;
  tokenDecimals?: number;
  isEvm?: boolean;
}): string {
  const { depositAddress, amount, tokenAddress, isEvm } = opts;

  if (!isEvm) {
    // For non-EVM chains, just encode the deposit address
    return depositAddress;
  }

  // EVM: build EIP-681 URI
  if (tokenAddress && tokenAddress !== "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
    // ERC-20 transfer: ethereum:<tokenAddress>/transfer?address=<to>&uint256=<amount>
    return `ethereum:${tokenAddress}/transfer?address=${depositAddress}&uint256=${amount}`;
  }

  // Native ETH: ethereum:<address>?value=<amountInWei>
  return `ethereum:${depositAddress}?value=${amount}`;
}
