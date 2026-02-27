export type ChainType = "evm" | "solana" | "sui" | "near" | "aptos" | "starknet" | "ton" | "tron";

export interface SupportedChain {
  id: string;
  name: string;
  type: ChainType;
  logo?: string;
}

export const SUPPORTED_CHAINS: SupportedChain[] = [
  { id: "aptos", name: "Aptos", type: "aptos" },
  { id: "arbitrum", name: "Arbitrum", type: "evm" },
  { id: "base", name: "Base", type: "evm" },
  { id: "bsc", name: "BNB Chain", type: "evm" },
  { id: "ethereum", name: "Ethereum", type: "evm" },
  { id: "near", name: "NEAR", type: "near" },
  { id: "optimism", name: "Optimism", type: "evm" },
  { id: "polygon", name: "Polygon", type: "evm" },
  { id: "solana", name: "Solana", type: "solana" },
  { id: "starknet", name: "Starknet", type: "starknet" },
  { id: "sui", name: "Sui", type: "sui" },
  { id: "tron", name: "Tron", type: "tron" },
];

export function getChainById(id: string): SupportedChain | undefined {
  return SUPPORTED_CHAINS.find((c) => c.id === id);
}

export function getChainsByType(type: ChainType): SupportedChain[] {
  return SUPPORTED_CHAINS.filter((c) => c.type === type);
}
