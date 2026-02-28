"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Exchange data
// ---------------------------------------------------------------------------

export interface ExchangeGuide {
  id: string;
  name: string;
  region?: string;
  supportedNetworks: { chain: string; token: string }[];
  steps: string[];
  warnings: string[];
  url: string;
}

export const EXCHANGE_GUIDES: ExchangeGuide[] = [
  {
    id: "shakepay",
    name: "Shakepay",
    region: "Canada",
    supportedNetworks: [{ chain: "Ethereum", token: "USDC" }],
    steps: [
      "Open Shakepay and go to your Crypto wallets.",
      "Select USDC and tap Receive.",
      "Copy your USDC deposit address (ERC-20 only).",
      "Use this address as your settlement address in goBlink.",
      "Shakepay auto-converts USDC to CAD at 1:1.",
    ],
    warnings: [
      "Shakepay only supports USDC on Ethereum (ERC-20). Do NOT send on Base, Polygon, or any other network — funds will be lost.",
    ],
    url: "https://shakepay.com",
  },
  {
    id: "coinbase",
    name: "Coinbase",
    supportedNetworks: [
      { chain: "Ethereum", token: "USDC" },
      { chain: "Solana", token: "USDC" },
      { chain: "Polygon", token: "USDC" },
    ],
    steps: [
      "Open Coinbase and go to Assets → USDC.",
      "Tap Receive and select the correct network.",
      "Copy your deposit address.",
      "Use this address as your settlement address in goBlink.",
    ],
    warnings: [
      "Coinbase deposit addresses may rotate. Always verify your current address before updating settlement settings.",
      "Make sure the network you select in goBlink matches the network you selected in Coinbase.",
    ],
    url: "https://coinbase.com",
  },
  {
    id: "kraken",
    name: "Kraken",
    supportedNetworks: [{ chain: "Ethereum", token: "USDC" }],
    steps: [
      "Log in to Kraken and go to Funding → Deposit.",
      "Search for USDC and select Ethereum (ERC-20).",
      "Copy your deposit address.",
      "Use this address as your settlement address in goBlink.",
    ],
    warnings: [
      "Kraken currently only supports USDC deposits on Ethereum. Sending on other networks will result in lost funds.",
    ],
    url: "https://kraken.com",
  },
  {
    id: "binance",
    name: "Binance",
    supportedNetworks: [
      { chain: "Ethereum", token: "USDC" },
      { chain: "Arbitrum", token: "USDC" },
    ],
    steps: [
      "Log in to Binance and go to Wallet → Spot → Deposit.",
      "Search for USDC and select your preferred network.",
      "Copy your deposit address.",
      "Use this address as your settlement address in goBlink.",
    ],
    warnings: [
      "Double-check that the network in goBlink matches the network you selected on Binance. Wrong network = lost funds.",
    ],
    url: "https://binance.com",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExchangeOfframpGuide({ compact = false }: { compact?: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">
            Withdraw to Exchange
          </h3>
          <p className="text-sm text-zinc-400">
            Once funds arrive in your self-custodial wallet, you can send them to
            an exchange to convert to fiat. This is guidance only — goBlink never
            sends funds on your behalf.
          </p>
        </div>
      )}

      <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-300">
          These are instructions for manually withdrawing from your own wallet to
          an exchange. goBlink settles payments to your wallet address — you
          control what happens next.
        </p>
      </div>

      <div className="space-y-2">
        {EXCHANGE_GUIDES.map((exchange) => {
          const isExpanded = expandedId === exchange.id;
          return (
            <Card key={exchange.id} className="overflow-hidden">
              <button
                onClick={() =>
                  setExpandedId(isExpanded ? null : exchange.id)
                }
                className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-bold text-white">
                    {exchange.name[0]}
                  </div>
                  <div>
                    <span className="font-medium text-white">
                      {exchange.name}
                    </span>
                    {exchange.region && (
                      <span className="text-xs text-zinc-500 ml-2">
                        ({exchange.region})
                      </span>
                    )}
                    <div className="flex gap-1.5 mt-0.5">
                      {exchange.supportedNetworks.map((n) => (
                        <span
                          key={`${n.chain}-${n.token}`}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400"
                        >
                          {n.token} on {n.chain}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-zinc-800">
                  {/* Steps */}
                  <div className="pt-3 space-y-2">
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Steps
                    </p>
                    <ol className="space-y-1.5">
                      {exchange.steps.map((step, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-zinc-300"
                        >
                          <span className="text-xs font-bold text-zinc-500 mt-0.5 shrink-0 w-4">
                            {i + 1}.
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Warnings */}
                  {exchange.warnings.length > 0 && (
                    <div className="space-y-2">
                      {exchange.warnings.map((warning, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                        >
                          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-300">{warning}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Link */}
                  <a
                    href={exchange.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Visit {exchange.name}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
