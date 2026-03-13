"use client";

import { useState, useEffect, useRef } from "react";
import { createPublicClient, http, formatEther, erc20Abi, type Address } from "viem";
import { mainnet, polygon, arbitrum, optimism, base, bsc } from "viem/chains";

export interface ChainBalance {
  chainId: string;
  chainName: string;
  totalUsd: number;
  loading: boolean;
  hasTokens: boolean;
}

interface UseChainBalancesOptions {
  walletAddress: string | null;
  enabled: boolean;
}

/**
 * Popular stablecoin addresses per chain for quick balance check.
 * We check native + USDC + USDT to estimate chain value.
 */
const CHAIN_CONFIGS = [
  {
    id: "ethereum",
    name: "Ethereum",
    chain: mainnet,
    nativeSymbol: "ETH",
    stablecoins: [
      { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address, symbol: "USDC", decimals: 6 },
      { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" as Address, symbol: "USDT", decimals: 6 },
    ],
  },
  {
    id: "base",
    name: "Base",
    chain: base,
    nativeSymbol: "ETH",
    stablecoins: [
      { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address, symbol: "USDC", decimals: 6 },
    ],
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    chain: arbitrum,
    nativeSymbol: "ETH",
    stablecoins: [
      { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as Address, symbol: "USDC", decimals: 6 },
      { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as Address, symbol: "USDT", decimals: 6 },
    ],
  },
  {
    id: "polygon",
    name: "Polygon",
    chain: polygon,
    nativeSymbol: "POL",
    stablecoins: [
      { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as Address, symbol: "USDC", decimals: 6 },
      { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as Address, symbol: "USDT", decimals: 6 },
    ],
  },
  {
    id: "optimism",
    name: "Optimism",
    chain: optimism,
    nativeSymbol: "ETH",
    stablecoins: [
      { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as Address, symbol: "USDC", decimals: 6 },
      { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58" as Address, symbol: "USDT", decimals: 6 },
    ],
  },
  {
    id: "bsc",
    name: "BNB Chain",
    chain: bsc,
    nativeSymbol: "BNB",
    stablecoins: [
      { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d" as Address, symbol: "USDC", decimals: 18 },
      { address: "0x55d398326f99059fF775485246999027B3197955" as Address, symbol: "USDT", decimals: 18 },
    ],
  },
] as const;

/**
 * Rough price estimates for native tokens (used for quick USD approximation).
 * These are fallback values when we don't have real-time prices.
 * The actual token prices come from the 1Click token list.
 */
const NATIVE_PRICE_FALLBACK: Record<string, number> = {
  ETH: 2500,
  POL: 0.4,
  BNB: 300,
};

export function useChainBalances({ walletAddress, enabled }: UseChainBalancesOptions) {
  const [chainBalances, setChainBalances] = useState<ChainBalance[]>(
    CHAIN_CONFIGS.map((c) => ({
      chainId: c.id,
      chainName: c.name,
      totalUsd: 0,
      loading: true,
      hasTokens: false,
    }))
  );
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !walletAddress || fetchedRef.current) return;
    fetchedRef.current = true;
    let mounted = true;

    // Check each chain in parallel, updating state as results come in
    CHAIN_CONFIGS.forEach(async (config) => {
      try {
        const client = createPublicClient({
          chain: config.chain,
          transport: http(),
        });

        // Fetch native balance + stablecoin balances in parallel
        const [nativeBalance, ...stableResults] = await Promise.all([
          client.getBalance({ address: walletAddress as Address }),
          ...config.stablecoins.map((sc) =>
            client
              .readContract({
                address: sc.address,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [walletAddress as Address],
              })
              .catch(() => BigInt(0))
          ),
        ]);

        if (!mounted) return;

        // Calculate rough USD total
        const nativeEth = parseFloat(formatEther(nativeBalance));
        const nativePrice = NATIVE_PRICE_FALLBACK[config.nativeSymbol] || 0;
        let totalUsd = nativeEth * nativePrice;

        config.stablecoins.forEach((sc, i) => {
          const bal = stableResults[i] as bigint;
          if (bal > BigInt(0)) {
            // Use BigInt division for large values to avoid precision loss
            const divisor = BigInt(10 ** sc.decimals);
            totalUsd += Number(bal / divisor) + Number(bal % divisor) / (10 ** sc.decimals);
          }
        });

        const hasTokens = totalUsd > 0.01;

        setChainBalances((prev) =>
          prev.map((cb) =>
            cb.chainId === config.id
              ? { ...cb, totalUsd, loading: false, hasTokens }
              : cb
          )
        );
      } catch {
        if (!mounted) return;
        // Mark as loaded but no tokens on error
        setChainBalances((prev) =>
          prev.map((cb) =>
            cb.chainId === config.id ? { ...cb, loading: false } : cb
          )
        );
      }
    });

    return () => { mounted = false; };
  }, [enabled, walletAddress]);

  // Reset when wallet changes
  useEffect(() => {
    fetchedRef.current = false;
    setChainBalances(
      CHAIN_CONFIGS.map((c) => ({
        chainId: c.id,
        chainName: c.name,
        totalUsd: 0,
        loading: true,
        hasTokens: false,
      }))
    );
  }, [walletAddress]);

  const allLoaded = chainBalances.every((cb) => !cb.loading);
  const chainsWithBalance = chainBalances.filter((cb) => cb.hasTokens);
  const bestChain = chainsWithBalance.length > 0
    ? chainsWithBalance.reduce((best, c) => (c.totalUsd > best.totalUsd ? c : best))
    : null;

  return {
    chainBalances,
    chainsWithBalance,
    bestChain,
    allLoaded,
    isEvm: true,
  };
}
