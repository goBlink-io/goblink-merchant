"use client";

import { useState, useEffect } from "react";
import { Wallet, ChevronDown } from "lucide-react";
import { isMobile, getWalletDeepLinks } from "@/lib/mobile-detect";
import { cn } from "@/lib/utils";

interface MobileWalletConnectProps {
  /** Called when user clicks "More wallets" to open the existing connect modal */
  onFallbackConnect: () => void;
}

export default function MobileWalletConnect({ onFallbackConnect }: MobileWalletConnectProps) {
  const [mobile, setMobile] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setMobile(isMobile());
  }, []);

  // Only render on mobile
  if (!mobile) return null;

  const wallets = getWalletDeepLinks();
  const visible = showAll ? wallets : wallets.slice(0, 3);

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500 text-center">Open in wallet app</p>

      <div className="grid grid-cols-3 gap-2">
        {visible.map((w) => (
          <a
            key={w.name}
            href={w.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-colors"
          >
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: w.color }}
            >
              {w.icon}
            </div>
            <span className="text-xs text-zinc-300 text-center leading-tight">
              {w.name}
            </span>
          </a>
        ))}
      </div>

      {!showAll && wallets.length > 3 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full flex items-center justify-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          More wallets
          <ChevronDown className="h-3 w-3" />
        </button>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-700/50" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-zinc-900 px-2 text-zinc-600">or</span>
        </div>
      </div>

      <button
        onClick={onFallbackConnect}
        className={cn(
          "w-full py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-200",
          "hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
        )}
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </button>
    </div>
  );
}
