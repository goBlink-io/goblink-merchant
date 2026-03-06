"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupportedChain } from "@/lib/chains";
import type { ChainBalance } from "@/hooks/useChainBalances";

interface ChainSelectorProps {
  chains: SupportedChain[];
  selectedChain: SupportedChain;
  onSelect: (chain: SupportedChain) => void;
  chainBalances: ChainBalance[];
  /** If only ONE chain has tokens, auto-select and hide dropdown */
  singleChainMode?: boolean;
  isEvm: boolean;
}

function formatChainUsd(amount: number): string {
  if (amount < 0.01) return "";
  if (amount < 1000) return `~$${amount.toFixed(0)}`;
  if (amount < 1000000) return `~$${(amount / 1000).toFixed(1)}K`;
  return `~$${(amount / 1000000).toFixed(1)}M`;
}

export default function ChainSelector({
  chains,
  selectedChain,
  onSelect,
  chainBalances,
  singleChainMode,
  isEvm,
}: ChainSelectorProps) {
  const [open, setOpen] = useState(false);

  const getChainBalance = (chainId: string): ChainBalance | undefined =>
    chainBalances.find((cb) => cb.chainId === chainId);

  // Sort chains: those with balance first, ordered by USD value
  const sortedChains = useMemo(() => {
    if (!isEvm || chainBalances.length === 0) return chains;

    return [...chains].sort((a, b) => {
      const balA = getChainBalance(a.id);
      const balB = getChainBalance(b.id);
      const usdA = balA?.totalUsd ?? 0;
      const usdB = balB?.totalUsd ?? 0;
      // Chains with balance first
      if (usdA > 0 && usdB === 0) return -1;
      if (usdB > 0 && usdA === 0) return 1;
      // Then by USD value descending
      return usdB - usdA;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chains, chainBalances, isEvm]);

  // Single chain mode — show as statement
  if (singleChainMode) {
    const bal = getChainBalance(selectedChain.id);
    return (
      <div>
        <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
          Pay from
        </label>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-sm">
          <span className="text-zinc-200 font-medium">{selectedChain.name}</span>
          {isEvm && bal && bal.totalUsd > 0 && (
            <span className="text-zinc-500 text-xs">
              ({formatChainUsd(bal.totalUsd)})
            </span>
          )}
          <Check className="h-4 w-4 text-emerald-400 ml-auto" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
        Pay from
      </label>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-colors text-sm"
        >
          <span className="flex items-center gap-2">
            <span className="text-zinc-200">{selectedChain.name}</span>
            {isEvm && (() => {
              const bal = getChainBalance(selectedChain.id);
              return bal && bal.totalUsd > 0 ? (
                <span className="text-zinc-500 text-xs">
                  ({formatChainUsd(bal.totalUsd)})
                </span>
              ) : null;
            })()}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-zinc-400 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>

        {open && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl bg-zinc-900 border border-zinc-700 shadow-xl">
            {sortedChains.map((chain) => {
              const bal = getChainBalance(chain.id);
              const isSelected = chain.id === selectedChain.id;
              const noBalance = isEvm && bal && !bal.loading && !bal.hasTokens;

              return (
                <button
                  key={chain.id}
                  onClick={() => {
                    onSelect(chain);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
                    isSelected && "bg-zinc-800 text-blue-400",
                    noBalance && "opacity-50",
                    !isSelected && "hover:bg-zinc-800"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={
                        isSelected ? "text-blue-400" : "text-zinc-200"
                      }
                    >
                      {chain.name}
                    </span>
                    {isEvm && bal && (
                      <>
                        {bal.loading ? (
                          <Loader2 className="h-3 w-3 text-zinc-600 animate-spin" />
                        ) : bal.totalUsd > 0 ? (
                          <span className="text-zinc-500 text-xs">
                            ({formatChainUsd(bal.totalUsd)})
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs">
                            No balance
                          </span>
                        )}
                      </>
                    )}
                  </span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-blue-400" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
