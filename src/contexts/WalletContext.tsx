"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAccount as useWagmiAccount, useDisconnect as useWagmiDisconnect } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { useCurrentAccount as useSuiAccount, useDisconnectWallet as useSuiDisconnect } from "@mysten/dapp-kit";
import { useWallet as useAptosWallet } from "@aptos-labs/wallet-adapter-react";
import { useAccount as useStarknetAccount, useDisconnect as useStarknetDisconnect } from "@starknet-react/core";
import { useTonAddress, useTonConnectUI } from "@tonconnect/ui-react";
import { useWallet as useTronWallet } from "@tronweb3/tronwallet-adapter-react-hooks";
import type { ChainType } from "@/lib/chains";

export interface ConnectedWallet {
  chainType: ChainType;
  address: string;
}

interface WalletContextType {
  connectedWallets: ConnectedWallet[];
  getAddressForChain: (chainType: ChainType) => string | null;
  isChainConnected: (chainType: ChainType) => boolean;
  connectWallet: (chainType: ChainType) => void;
  disconnectChain: (chainType: ChainType) => void;
  disconnectAll: () => void;
  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  modalChainType: ChainType | null;
  setModalChainType: (type: ChainType | null) => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletContextProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalChainType, setModalChainType] = useState<ChainType | null>(null);

  // EVM (wagmi/AppKit)
  const { address: evmAddress, isConnected: evmConnected } = useWagmiAccount();
  const { disconnect: wagmiDisconnect } = useWagmiDisconnect();
  const { open: openAppKit } = useAppKit();

  // Solana (shares AppKit session with EVM)
  // AppKit handles Solana through the same modal — address comes from AppKit state

  // Sui
  const suiAccount = useSuiAccount();
  const { mutate: suiDisconnect } = useSuiDisconnect();

  // Aptos
  const {
    account: aptosAccount,
    connected: aptosConnected,
    disconnect: aptosDisconnect,
  } = useAptosWallet();

  // Starknet
  const { address: starknetAddress } = useStarknetAccount();
  const { disconnect: starknetDisconnect } = useStarknetDisconnect();

  // TON
  const tonAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();

  // Tron
  const { address: tronAddress, disconnect: tronDisconnect } = useTronWallet();

  const connectedWallets = useMemo(() => {
    const wallets: ConnectedWallet[] = [];

    if (evmConnected && evmAddress) {
      wallets.push({ chainType: "evm", address: evmAddress });
    }
    // Solana handled via AppKit — same session as EVM for Reown
    if (suiAccount) {
      wallets.push({ chainType: "sui", address: suiAccount.address });
    }
    if (aptosConnected && aptosAccount?.address) {
      wallets.push({ chainType: "aptos", address: aptosAccount.address.toString() });
    }
    if (starknetAddress) {
      wallets.push({ chainType: "starknet", address: starknetAddress });
    }
    if (tonAddress) {
      wallets.push({ chainType: "ton", address: tonAddress });
    }
    if (tronAddress) {
      wallets.push({ chainType: "tron", address: tronAddress });
    }

    return wallets;
  }, [
    evmConnected,
    evmAddress,
    suiAccount,
    aptosConnected,
    aptosAccount?.address,
    starknetAddress,
    tonAddress,
    tronAddress,
  ]);

  const getAddressForChain = useCallback(
    (chainType: ChainType): string | null => {
      // EVM and Solana share AppKit session
      if (chainType === "evm" || chainType === "solana") {
        return evmAddress ?? null;
      }
      const wallet = connectedWallets.find((w) => w.chainType === chainType);
      return wallet?.address ?? null;
    },
    [connectedWallets, evmAddress]
  );

  const isChainConnected = useCallback(
    (chainType: ChainType): boolean => {
      if (chainType === "evm" || chainType === "solana") return evmConnected;
      return connectedWallets.some((w) => w.chainType === chainType);
    },
    [connectedWallets, evmConnected]
  );

  const connectWallet = useCallback(
    (chainType: ChainType) => {
      if (chainType === "evm" || chainType === "solana") {
        openAppKit();
      } else {
        // For non-AppKit chains, open our custom modal
        setModalChainType(chainType);
        setModalOpen(true);
      }
    },
    [openAppKit]
  );

  const disconnectChain = useCallback(
    (chainType: ChainType) => {
      switch (chainType) {
        case "evm":
        case "solana":
          wagmiDisconnect();
          break;
        case "sui":
          suiDisconnect();
          break;
        case "aptos":
          aptosDisconnect();
          break;
        case "starknet":
          starknetDisconnect();
          break;
        case "ton":
          tonConnectUI.disconnect();
          break;
        case "tron":
          tronDisconnect();
          break;
      }
    },
    [wagmiDisconnect, suiDisconnect, aptosDisconnect, starknetDisconnect, tonConnectUI, tronDisconnect]
  );

  const disconnectAll = useCallback(() => {
    wagmiDisconnect();
    suiDisconnect();
    aptosDisconnect();
    starknetDisconnect();
    tonConnectUI.disconnect();
    tronDisconnect();
  }, [wagmiDisconnect, suiDisconnect, aptosDisconnect, starknetDisconnect, tonConnectUI, tronDisconnect]);

  const value = useMemo(
    () => ({
      connectedWallets,
      getAddressForChain,
      isChainConnected,
      connectWallet,
      disconnectChain,
      disconnectAll,
      isModalOpen,
      setModalOpen,
      modalChainType,
      setModalChainType,
    }),
    [
      connectedWallets,
      getAddressForChain,
      isChainConnected,
      connectWallet,
      disconnectChain,
      disconnectAll,
      isModalOpen,
      modalChainType,
    ]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWalletContext must be used within WalletContextProvider");
  return ctx;
}
