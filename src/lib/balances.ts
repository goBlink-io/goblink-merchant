import type { ChainType } from "./chains";

export interface TokenBalance {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  balance: string;
  balanceUsd: number;
  logoUrl?: string;
  chainId: string;
  defuseAssetId: string;
}

// Fetch native/token balances for a connected wallet address on a given chain.
// This is a simplified implementation — in production, each chain would have
// its own RPC balance fetcher. For the checkout flow, we rely on 1Click token
// list + user-selected token, so balances are informational.
export async function fetchBalances(
  _address: string,
  _chainType: ChainType,
  _chainId: string
): Promise<TokenBalance[]> {
  // Placeholder: balances will be fetched client-side from wallet providers
  // or enriched via the 1Click tokens endpoint.
  return [];
}
