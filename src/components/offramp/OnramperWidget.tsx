"use client";

import { useState } from "react";

interface OnramperWidgetProps {
  defaultFiat?: string;
  walletAddress?: string;
}

export function OnramperWidget({
  defaultFiat = "USD",
  walletAddress,
}: OnramperWidgetProps) {
  const [loaded, setLoaded] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_ONRAMPER_API_KEY || "";

  if (!apiKey) {
    return (
      <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-6 text-center">
        <p className="text-sm text-zinc-400">
          Onramper widget is not configured. Set NEXT_PUBLIC_ONRAMPER_API_KEY in
          your environment.
        </p>
      </div>
    );
  }

  const params = new URLSearchParams({
    apiKey,
    mode: "sell",
    sell_defaultCrypto: "USDC",
    sell_defaultFiat: defaultFiat,
    sell_onlyCryptos: "USDC",
    themeName: "dark",
    containerColor: "18181bff", // zinc-900
    primaryColor: "2563ebff", // blue-600
    secondaryColor: "27272aff", // zinc-800
    cardColor: "27272aff",
    primaryTextColor: "ffffffff",
    secondaryTextColor: "a1a1aaff", // zinc-400
    borderRadius: "0.75",
  });

  if (walletAddress) {
    params.set("walletAddress", walletAddress);
  }

  const widgetUrl = `https://buy.onramper.com/?${params.toString()}`;

  return (
    <div className="relative w-full">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 rounded-lg z-10">
          <div className="flex items-center gap-3">
            <span className="h-5 w-5 border-2 border-zinc-600 border-t-blue-400 rounded-full animate-spin" />
            <span className="text-sm text-zinc-400">Loading widget...</span>
          </div>
        </div>
      )}
      <iframe
        src={widgetUrl}
        title="Onramper Offramp Widget"
        allow="accelerometer; autoplay; camera; gyroscope; payment"
        className="w-full rounded-lg border border-zinc-700"
        style={{ height: 600 }}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
