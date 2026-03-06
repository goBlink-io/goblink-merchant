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

// EVM chains expect 0x-prefixed 64-char hex (66 chars total)
const EVM_CHAINS = new Set([
  "arbitrum", "base", "bsc", "ethereum", "optimism", "polygon", "starknet",
]);

const EVM_TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const SOLANA_TX_HASH_RE = /^[1-9A-HJ-NP-Za-km-z]{43,88}$/; // base58
const SUI_TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

/** Validate txHash format for the given chain. Returns true if valid. */
function isValidTxHash(chain: string, txHash: string): boolean {
  const c = chain.toLowerCase();
  if (EVM_CHAINS.has(c)) return EVM_TX_HASH_RE.test(txHash);
  if (c === "solana") return SOLANA_TX_HASH_RE.test(txHash);
  if (c === "sui") return SUI_TX_HASH_RE.test(txHash);
  // For other chains (aptos, near, tron), allow non-empty alphanumeric+hex strings
  return /^[a-zA-Z0-9_-]+$/.test(txHash);
}

export function getExplorerTxUrl(
  chain: string,
  txHash: string
): string | null {
  const base = EXPLORER_TX_URLS[chain.toLowerCase()];
  if (!base || !txHash) return null;
  if (!isValidTxHash(chain, txHash)) return null;
  return `${base}${txHash}`;
}
