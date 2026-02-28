"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TokenWithBalance } from "@/hooks/useTokenBalances";
import { sortTokensByBalance } from "@/hooks/useTokenBalances";

interface TokenSelectorProps {
  tokens: TokenWithBalance[];
  selectedToken: TokenWithBalance | null;
  onSelect: (token: TokenWithBalance) => void;
  loading: boolean;
  chainName: string;
  isEvm: boolean;
  /** If only one token has enough, show as statement instead of dropdown */
  singleTokenMode?: boolean;
}

/**
 * Format a USD amount for display
 */
function formatUsd(amount: number): string {
  if (amount < 0.01) return "";
  if (amount < 1) return `~$${amount.toFixed(2)}`;
  if (amount < 1000) return `~$${amount.toFixed(2)}`;
  if (amount < 1000000) return `~$${(amount / 1000).toFixed(1)}K`;
  return `~$${(amount / 1000000).toFixed(1)}M`;
}

export default function TokenSelector({
  tokens,
  selectedToken,
  onSelect,
  loading,
  chainName,
  isEvm,
  singleTokenMode,
}: TokenSelectorProps) {
  const [open, setOpen] = useState(false);

  // Sort tokens: sufficient balance first, then insufficient
  const sortedTokens = useMemo(() => {
    if (!isEvm) return tokens; // Don't sort for non-EVM (no balance data)
    return sortTokensByBalance(tokens);
  }, [tokens, isEvm]);

  // Group into popular and rest
  const { popular, rest } = useMemo(() => {
    const popularSymbols = ["USDC", "USDT", "ETH", "WETH", "SOL", "BTC", "WBTC"];
    return {
      popular: sortedTokens.filter((t) =>
        popularSymbols.includes(t.symbol.toUpperCase())
      ),
      rest: sortedTokens.filter(
        (t) => !popularSymbols.includes(t.symbol.toUpperCase())
      ),
    };
  }, [sortedTokens]);

  // Single-token mode: show as statement
  if (singleTokenMode && selectedToken) {
    return (
      <div>
        <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
          Pay with
        </label>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-sm">
          <span className="text-zinc-200 font-medium">
            {selectedToken.symbol}
          </span>
          {isEvm && selectedToken.balance !== "0" && (
            <span className="text-zinc-500 text-xs">
              {selectedToken.balance}
              {selectedToken.balanceUsd > 0 && (
                <> ({formatUsd(selectedToken.balanceUsd)})</>
              )}
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
        Pay with
      </label>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          disabled={loading && tokens.length === 0}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-colors text-sm disabled:opacity-50"
        >
          {loading && tokens.length === 0 ? (
            <span className="text-zinc-500 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading tokens...
            </span>
          ) : selectedToken ? (
            <span className="flex items-center gap-2 text-zinc-200">
              <span className="font-medium">{selectedToken.symbol}</span>
              <span className="text-zinc-500 text-xs">{selectedToken.name}</span>
              {isEvm && selectedToken.balance !== "0" && (
                <span className="text-zinc-500 text-xs ml-1">
                  — {selectedToken.balance}
                  {selectedToken.balanceUsd > 0 && (
                    <> ({formatUsd(selectedToken.balanceUsd)})</>
                  )}
                </span>
              )}
            </span>
          ) : (
            <span className="text-zinc-500">Select token</span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-zinc-400 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>

        {open && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl bg-zinc-900 border border-zinc-700 shadow-xl">
            {sortedTokens.length === 0 ? (
              <div className="px-4 py-3 text-sm text-zinc-500">
                No tokens available on {chainName}
              </div>
            ) : (
              <>
                {popular.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                      Popular
                    </div>
                    {popular.map((token) => (
                      <TokenRow
                        key={token.defuse_asset_id}
                        token={token}
                        selected={token.defuse_asset_id === selectedToken?.defuse_asset_id}
                        isEvm={isEvm}
                        onSelect={() => {
                          onSelect(token);
                          setOpen(false);
                        }}
                      />
                    ))}
                  </>
                )}
                {rest.length > 0 && (
                  <>
                    {popular.length > 0 && (
                      <div className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600 border-t border-zinc-800 mt-1 pt-1.5">
                        All tokens
                      </div>
                    )}
                    {rest.map((token) => (
                      <TokenRow
                        key={token.defuse_asset_id}
                        token={token}
                        selected={token.defuse_asset_id === selectedToken?.defuse_asset_id}
                        isEvm={isEvm}
                        onSelect={() => {
                          onSelect(token);
                          setOpen(false);
                        }}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TokenRow({
  token,
  selected,
  isEvm,
  onSelect,
}: {
  token: TokenWithBalance;
  selected: boolean;
  isEvm: boolean;
  onSelect: () => void;
}) {
  const hasBalance = token.balanceRaw > BigInt(0);
  const disabled = isEvm && !token.hasEnough && hasBalance;
  const noBalance = isEvm && !hasBalance;

  return (
    <button
      onClick={onSelect}
      disabled={noBalance}
      className={cn(
        "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
        selected && "bg-zinc-800 text-blue-400",
        noBalance && "opacity-40 cursor-not-allowed",
        !noBalance && !selected && "hover:bg-zinc-800"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn(
          selected ? "text-blue-400" : noBalance ? "text-zinc-500" : "text-zinc-200",
          "font-medium shrink-0"
        )}>
          {token.symbol}
        </span>
        {isEvm && hasBalance && (
          <span className="text-zinc-500 text-xs truncate">
            {token.balance}
            {token.balanceUsd > 0 && ` (${formatUsd(token.balanceUsd)})`}
          </span>
        )}
        {isEvm && noBalance && (
          <span className="text-zinc-600 text-xs">No balance</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        {isEvm && disabled && (
          <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
            Insufficient
          </span>
        )}
        {selected && <Check className="h-4 w-4 text-blue-400" />}
      </div>
    </button>
  );
}
