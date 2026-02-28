"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useReadContracts, useBalance, useAccount } from "wagmi";
import { formatUnits, erc20Abi, type Address } from "viem";

interface Token {
  defuse_asset_id: string;
  blockchain: string;
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  icon?: string;
  price_usd?: number;
}

export interface TokenWithBalance extends Token {
  balance: string; // formatted balance string
  balanceRaw: bigint;
  balanceUsd: number;
  hasEnough: boolean;
}

interface UseTokenBalancesOptions {
  tokens: Token[];
  requiredAmountUsd: number;
  walletAddress: string | null;
  chainType: string;
  enabled: boolean;
}

/**
 * Map our chain IDs to wagmi chain IDs for EVM chains.
 */
const CHAIN_ID_MAP: Record<string, number> = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  bsc: 56,
};

/**
 * Check if a token address represents the native token (ETH, MATIC, etc.)
 */
function isNativeToken(token: Token): boolean {
  const addr = token.address?.toLowerCase() || "";
  return (
    addr === "native" ||
    addr === "" ||
    addr === "0x0000000000000000000000000000000000000000" ||
    addr === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
    // Some tokens just have symbol ETH / MATIC without a contract
    (token.symbol === "ETH" && (!token.address || addr === "native"))
  );
}

export function useTokenBalances({
  tokens,
  requiredAmountUsd,
  walletAddress,
  chainType,
  enabled,
}: UseTokenBalancesOptions) {
  const [balances, setBalances] = useState<Map<string, { balance: bigint; formatted: string }>>(
    new Map()
  );
  const [loading, setLoading] = useState(false);
  const prevTokenIdsRef = useRef<string>("");

  // Only use wagmi hooks for EVM chains
  const isEvm = chainType === "evm";

  // Determine the wagmi chain ID from the first token's blockchain
  const wagmiChainId = isEvm
    ? tokens.length > 0
      ? CHAIN_ID_MAP[mapBlockchainToChainId(tokens[0].blockchain)] || 1
      : 1
    : undefined;

  // Separate native and ERC-20 tokens
  const nativeToken = isEvm ? tokens.find(isNativeToken) : null;
  const erc20Tokens = isEvm
    ? tokens.filter((t) => !isNativeToken(t) && t.address && t.address.length > 8)
    : [];

  // Native token balance
  const { data: nativeBalance } = useBalance({
    address: walletAddress as Address | undefined,
    chainId: wagmiChainId,
    query: {
      enabled: enabled && isEvm && !!walletAddress && !!nativeToken,
    },
  });

  // ERC-20 balances via multicall
  const erc20Contracts = erc20Tokens.map((t) => ({
    address: t.address as Address,
    abi: erc20Abi,
    functionName: "balanceOf" as const,
    args: [walletAddress as Address] as const,
    chainId: wagmiChainId,
  }));

  const { data: erc20Results } = useReadContracts({
    contracts: erc20Contracts,
    query: {
      enabled: enabled && isEvm && !!walletAddress && erc20Contracts.length > 0,
    },
  });

  // Process results whenever they change
  useEffect(() => {
    if (!enabled || !isEvm || !walletAddress) return;

    const newBalances = new Map<string, { balance: bigint; formatted: string }>();

    // Native token balance
    if (nativeToken && nativeBalance) {
      newBalances.set(nativeToken.defuse_asset_id, {
        balance: nativeBalance.value,
        formatted: formatUnits(nativeBalance.value, nativeBalance.decimals),
      });
    }

    // ERC-20 balances
    if (erc20Results) {
      erc20Tokens.forEach((token, i) => {
        const result = erc20Results[i];
        if (result?.status === "success" && result.result !== undefined) {
          const bal = result.result as bigint;
          newBalances.set(token.defuse_asset_id, {
            balance: bal,
            formatted: formatUnits(bal, token.decimals),
          });
        }
      });
    }

    // Only update if the balances actually changed
    const tokenIds = tokens.map((t) => t.defuse_asset_id).join(",");
    if (tokenIds !== prevTokenIdsRef.current || newBalances.size > 0) {
      prevTokenIdsRef.current = tokenIds;
      setBalances(newBalances);
      setLoading(false);
    }
  }, [enabled, isEvm, walletAddress, nativeToken, nativeBalance, erc20Results, erc20Tokens, tokens]);

  // Set loading when tokens change
  useEffect(() => {
    if (enabled && isEvm && walletAddress && tokens.length > 0) {
      setLoading(true);
    }
  }, [enabled, isEvm, walletAddress, tokens.length]);

  // Build enriched token list with balances
  const getTokensWithBalances = useCallback((): TokenWithBalance[] => {
    return tokens.map((token) => {
      const balData = balances.get(token.defuse_asset_id);
      const balanceRaw = balData?.balance ?? BigInt(0);
      const formatted = balData?.formatted ?? "0";
      const balanceNum = parseFloat(formatted);
      const priceUsd = token.price_usd ?? 0;
      const balanceUsd = balanceNum * priceUsd;

      // Calculate if user has enough: compare balance USD to required
      // For stablecoins with price_usd, use USD comparison
      // For tokens without price, check against quote amount_in
      const hasEnough = balanceUsd >= requiredAmountUsd * 0.99; // 1% tolerance

      return {
        ...token,
        balance: formatBalance(formatted),
        balanceRaw,
        balanceUsd,
        hasEnough,
      };
    });
  }, [tokens, balances, requiredAmountUsd]);

  return {
    tokensWithBalances: getTokensWithBalances(),
    loading: loading && isEvm,
    isEvm,
  };
}

/**
 * Sort tokens: sufficient balance first (by USD value desc), then insufficient
 */
export function sortTokensByBalance(tokens: TokenWithBalance[]): TokenWithBalance[] {
  const sufficient = tokens
    .filter((t) => t.hasEnough)
    .sort((a, b) => b.balanceUsd - a.balanceUsd);
  const insufficient = tokens
    .filter((t) => !t.hasEnough)
    .sort((a, b) => b.balanceUsd - a.balanceUsd);
  return [...sufficient, ...insufficient];
}

/**
 * Auto-select the best token based on balance
 */
export function getAutoSelectedToken(tokens: TokenWithBalance[]): TokenWithBalance | null {
  const sorted = sortTokensByBalance(tokens);
  // Prefer USDC with enough balance
  const usdc = sorted.find((t) => t.symbol === "USDC" && t.hasEnough);
  if (usdc) return usdc;
  // Otherwise, first token with enough balance
  const first = sorted.find((t) => t.hasEnough);
  return first || null;
}

// --- Helpers ---

function formatBalance(formatted: string): string {
  const num = parseFloat(formatted);
  if (num === 0) return "0";
  if (num < 0.0001) return "<0.0001";
  if (num < 1) return num.toFixed(4);
  if (num < 1000) return num.toFixed(2);
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  return `${(num / 1000000).toFixed(1)}M`;
}

function mapBlockchainToChainId(blockchain: string): string {
  const bc = blockchain?.toLowerCase() || "";
  const map: Record<string, string> = {
    eth: "ethereum",
    "arbitrum-one": "arbitrum",
    "bnb-chain": "bsc",
    "polygon-pos": "polygon",
    "optimism-mainnet": "optimism",
    "base-mainnet": "base",
  };
  return map[bc] || bc;
}
