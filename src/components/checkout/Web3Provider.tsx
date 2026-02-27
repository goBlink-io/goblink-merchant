"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { createAppKit } from "@reown/appkit/react";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { SolanaAdapter } from "@reown/appkit-adapter-solana";
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  bsc,
} from "@reown/appkit/networks";
import { solana } from "@reown/appkit/networks";
import { SuiClientProvider, WalletProvider as SuiWalletProvider } from "@mysten/dapp-kit";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import {
  StarknetConfig,
  publicProvider as starknetPublicProvider,
} from "@starknet-react/core";
import { mainnet as starknetMainnet } from "@starknet-react/chains";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { WalletProvider as TronWalletProvider } from "@tronweb3/tronwallet-adapter-react-hooks";
import { WalletContextProvider } from "@/contexts/WalletContext";

// --- Configuration ---
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (!projectId) {
  throw new Error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is required");
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

// EVM + Solana via Reown AppKit
const evmNetworks = [mainnet, polygon, optimism, arbitrum, base, bsc];
const solanaNetworks = [solana];
const allNetworks = [...evmNetworks, ...solanaNetworks];

const wagmiAdapter = new WagmiAdapter({
  networks: evmNetworks,
  projectId,
});

const solanaAdapter = new SolanaAdapter();

if (typeof window !== "undefined" && projectId) {
  createAppKit({
    adapters: [wagmiAdapter, solanaAdapter],
    networks: [mainnet, polygon, optimism, arbitrum, base, bsc, solana] as [AppKitNetwork, ...AppKitNetwork[]],
    projectId,
    metadata: {
      name: "goBlink Merchant",
      description: "Pay with crypto",
      url: typeof window !== "undefined" ? window.location.origin : "",
      icons: [],
    },
    features: {
      analytics: false,
    },
  });
}

// Sui config
const suiNetworks = {
  mainnet: { url: "https://fullnode.mainnet.sui.io:443", network: "mainnet" as const },
};

// Starknet config
const starknetChains = [starknetMainnet];

export default function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        <SuiClientProvider networks={suiNetworks} defaultNetwork="mainnet">
          <SuiWalletProvider autoConnect>
            <AptosWalletAdapterProvider autoConnect>
              <StarknetConfig
                chains={starknetChains}
                provider={starknetPublicProvider()}
                autoConnect
              >
                <TonConnectUIProvider
                  manifestUrl={
                    typeof window !== "undefined"
                      ? `${window.location.origin}/tonconnect-manifest.json`
                      : ""
                  }
                >
                  <TronWalletProvider autoConnect>
                    <WalletContextProvider>
                      {children}
                    </WalletContextProvider>
                  </TronWalletProvider>
                </TonConnectUIProvider>
              </StarknetConfig>
            </AptosWalletAdapterProvider>
          </SuiWalletProvider>
        </SuiClientProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
