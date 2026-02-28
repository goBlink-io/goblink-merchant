"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Wallet,
  Check,
  AlertCircle,
  ArrowLeft,
  Pencil,
  Save,
} from "lucide-react";
import { ExchangeOfframpGuide } from "./exchange-offramp-guide";

// ---------------------------------------------------------------------------
// Constants (shared with onboarding wizard)
// ---------------------------------------------------------------------------

const CHAINS: Record<string, { name: string; tokens: string[] }> = {
  base: { name: "Base", tokens: ["USDC", "USDT", "ETH"] },
  ethereum: { name: "Ethereum", tokens: ["USDC", "USDT", "ETH"] },
  arbitrum: { name: "Arbitrum", tokens: ["USDC", "USDT", "ETH"] },
  optimism: { name: "Optimism", tokens: ["USDC", "USDT", "ETH"] },
  polygon: { name: "Polygon", tokens: ["USDC", "USDT", "MATIC"] },
  solana: { name: "Solana", tokens: ["USDC", "USDT", "SOL"] },
  near: { name: "NEAR", tokens: ["USDC", "USDT", "NEAR"] },
  sui: { name: "Sui", tokens: ["USDC", "SUI"] },
};

const EVM_CHAINS = ["base", "ethereum", "arbitrum", "optimism", "polygon"];

function isEvmAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

function isSolanaAddress(addr: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
}

function isNearAddress(addr: string): boolean {
  return /^[a-z0-9._-]+\.near$/.test(addr) || /^[a-f0-9]{64}$/.test(addr);
}

function isSuiAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(addr);
}

function isValidAddress(addr: string, chain: string): boolean {
  if (EVM_CHAINS.includes(chain)) return isEvmAddress(addr);
  if (chain === "solana") return isSolanaAddress(addr);
  if (chain === "near") return isNearAddress(addr);
  if (chain === "sui") return isSuiAddress(addr);
  return false;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MerchantData {
  id: string;
  wallet_address?: string;
  settlement_chain?: string;
  settlement_token?: string;
  onboarding_tier?: string;
  thirdweb_auth_method?: string;
  [key: string]: unknown;
}

export function SettlementSettingsContent({ merchant }: { merchant: MerchantData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [address, setAddress] = useState(merchant.wallet_address || "");
  const [chain, setChain] = useState(merchant.settlement_chain || "base");
  const [token, setToken] = useState(merchant.settlement_token || "USDC");

  const chainInfo = CHAINS[chain];
  const chainTokens = chainInfo?.tokens || [];
  const addressValid = address ? isValidAddress(address, chain) : true;

  async function handleSave() {
    if (!address || !isValidAddress(address, chain)) {
      setError("Please enter a valid wallet address for the selected chain.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/internal/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: merchant.onboarding_tier || "has_wallet",
          wallet_address: address,
          settlement_chain: chain,
          settlement_token: token,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || "Failed to update settlement settings");
      }

      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Current settlement config */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">
              Settlement Configuration
            </h2>
          </div>
          {!editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>

        {!editing ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-3">
                <p className="text-xs text-zinc-400 mb-1">Wallet Address</p>
                <p className="text-sm text-white font-mono truncate">
                  {merchant.wallet_address || "Not set"}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-3">
                <p className="text-xs text-zinc-400 mb-1">Chain</p>
                <p className="text-sm text-white font-medium">
                  {CHAINS[merchant.settlement_chain || ""]?.name || merchant.settlement_chain || "Not set"}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-3">
                <p className="text-xs text-zinc-400 mb-1">Token</p>
                <p className="text-sm text-white font-medium">
                  {merchant.settlement_token || "Not set"}
                </p>
              </div>
            </div>

            {saved && (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <Check className="h-4 w-4" />
                Settlement settings saved successfully.
              </div>
            )}

            {/* Zero custody badge */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Shield className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-300">
                We only store your public wallet address. Your private keys
                never leave your wallet.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Chain</Label>
              <Select
                value={chain}
                onValueChange={(val) => {
                  setChain(val);
                  const newTokens = CHAINS[val]?.tokens || [];
                  setToken(newTokens[0] || "USDC");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CHAINS).map(([key, c]) => (
                    <SelectItem key={key} value={key}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Token</Label>
              <Select value={token} onValueChange={setToken}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {chainTokens.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Wallet Address</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value.trim())}
                placeholder={
                  EVM_CHAINS.includes(chain)
                    ? "0x..."
                    : chain === "solana"
                      ? "Solana address"
                      : chain === "near"
                        ? "account.near"
                        : "Wallet address"
                }
              />
              {address && !addressValid && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Invalid address format for {chainInfo?.name}
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 rounded-lg px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving || !addressValid}>
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setAddress(merchant.wallet_address || "");
                  setChain(merchant.settlement_chain || "base");
                  setToken(merchant.settlement_token || "USDC");
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Exchange offramp guide */}
      <Card className="p-6">
        <ExchangeOfframpGuide />
      </Card>

      {/* Back link */}
      <Button variant="ghost" asChild>
        <a href="/dashboard/settings">
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </a>
      </Button>
    </div>
  );
}
