const EXPLORER_TX_URLS: Record<string, string> = {
  aptos: "https://explorer.aptoslabs.com/txn/",
  arbitrum: "https://arbiscan.io/tx/",
  base: "https://basescan.org/tx/",
  bsc: "https://bscscan.com/tx/",
  ethereum: "https://etherscan.io/tx/",
  near: "https://nearblocks.io/txns/",
  optimism: "https://optimistic.etherscan.io/tx/",
  polygon: "https://polygonscan.com/tx/",
  solana: "https://solscan.io/tx/",
  starknet: "https://starkscan.co/tx/",
  sui: "https://suiscan.xyz/mainnet/tx/",
  tron: "https://tronscan.org/#/transaction/",
};

export function getExplorerTxUrl(
  chain: string,
  txHash: string
): string | null {
  const base = EXPLORER_TX_URLS[chain.toLowerCase()];
  if (!base || !txHash) return null;
  return `${base}${txHash}`;
}
