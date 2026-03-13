"use client";

import { useRef, useEffect } from "react";
import { useWalletContext } from "@/contexts/WalletContext";
import { useConnectWallet as useSuiConnect, useWallets as useSuiWallets } from "@mysten/dapp-kit";
import { useWallet as useAptosWallet } from "@aptos-labs/wallet-adapter-react";
import { useConnect as useStarknetConnect } from "@starknet-react/core";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { useWallet as useTronWallet } from "@tronweb3/tronwallet-adapter-react-hooks";
import { X, Wallet } from "lucide-react";
import type { ChainType } from "@/lib/chains";

const CHAIN_LABELS: Record<string, string> = {
  sui: "Sui",
  aptos: "Aptos",
  starknet: "Starknet",
  ton: "TON",
  tron: "Tron",
  near: "NEAR",
};

export default function ConnectWalletModal() {
  const { isModalOpen, setModalOpen, modalChainType } = useWalletContext();

  if (!isModalOpen || !modalChainType) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setModalOpen(false)}
      />
      <div className="relative w-full max-w-sm mx-4 rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-zinc-50">
            Connect {CHAIN_LABELS[modalChainType] || modalChainType} Wallet
          </h3>
          <button
            onClick={() => setModalOpen(false)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ChainWalletOptions
          chainType={modalChainType}
          onConnected={() => setModalOpen(false)}
        />
      </div>
    </div>
  );
}

function ChainWalletOptions({
  chainType,
  onConnected,
}: {
  chainType: ChainType;
  onConnected: () => void;
}) {
  switch (chainType) {
    case "sui":
      return <SuiOptions onConnected={onConnected} />;
    case "aptos":
      return <AptosOptions onConnected={onConnected} />;
    case "starknet":
      return <StarknetOptions onConnected={onConnected} />;
    case "ton":
      return <TonOptions onConnected={onConnected} />;
    case "tron":
      return <TronOptions onConnected={onConnected} />;
    default:
      return (
        <p className="text-sm text-zinc-400">
          Wallet connection for {chainType} is not yet supported.
        </p>
      );
  }
}

function WalletButton({
  name,
  onClick,
}: {
  name: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 transition-all text-sm text-zinc-200"
    >
      <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-zinc-700/50">
        <Wallet className="h-4 w-4 text-zinc-400" />
      </div>
      {name}
    </button>
  );
}

function SuiOptions({ onConnected }: { onConnected: () => void }) {
  const wallets = useSuiWallets();
  const { mutate: connect } = useSuiConnect();

  return (
    <div className="space-y-2">
      {wallets.map((w) => (
        <WalletButton
          key={w.name}
          name={w.name}
          onClick={() => {
            connect({ wallet: w }, { onSuccess: onConnected });
          }}
        />
      ))}
      {wallets.length === 0 && (
        <p className="text-sm text-zinc-400">No Sui wallets detected. Please install one.</p>
      )}
    </div>
  );
}

function AptosOptions({ onConnected }: { onConnected: () => void }) {
  const { wallets, connect } = useAptosWallet();

  return (
    <div className="space-y-2">
      {wallets?.map((w) => (
        <WalletButton
          key={w.name}
          name={w.name}
          onClick={async () => {
            try {
              await connect(w.name as never);
              onConnected();
            } catch { /* user rejected */ }
          }}
        />
      ))}
      {(!wallets || wallets.length === 0) && (
        <p className="text-sm text-zinc-400">No Aptos wallets detected. Please install one.</p>
      )}
    </div>
  );
}

function StarknetOptions({ onConnected }: { onConnected: () => void }) {
  const { connectors, connect } = useStarknetConnect();

  return (
    <div className="space-y-2">
      {connectors.map((c) => (
        <WalletButton
          key={c.id}
          name={c.name}
          onClick={async () => {
            try {
              await connect({ connector: c });
              onConnected();
            } catch { /* user rejected */ }
          }}
        />
      ))}
    </div>
  );
}

function TonOptions({ onConnected }: { onConnected: () => void }) {
  const [tonConnectUI] = useTonConnectUI();

  return (
    <div className="space-y-2">
      <WalletButton
        name="TON Wallet"
        onClick={async () => {
          // TON modal is async — subscribe to status change
          tonConnectUI.openModal();
          const unsub = tonConnectUI.onStatusChange((w) => {
            if (w) { onConnected(); unsub(); }
          });
        }}
      />
    </div>
  );
}

function TronOptions({ onConnected }: { onConnected: () => void }) {
  const { wallets, select, connected } = useTronWallet();

  // Watch for connection to actually complete
  const pendingRef = useRef(false);
  useEffect(() => {
    if (pendingRef.current && connected) {
      pendingRef.current = false;
      onConnected();
    }
  }, [connected, onConnected]);

  return (
    <div className="space-y-2">
      {wallets?.map((w) => (
        <WalletButton
          key={w.adapter.name}
          name={w.adapter.name}
          onClick={() => {
            pendingRef.current = true;
            select(w.adapter.name);
          }}
        />
      ))}
      {(!wallets || wallets.length === 0) && (
        <p className="text-sm text-zinc-400">No Tron wallets detected. Please install TronLink.</p>
      )}
    </div>
  );
}
