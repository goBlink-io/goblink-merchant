"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Landmark,
  Globe,
  DollarSign,
  ChevronRight,
  Check,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { OfframpProviderCard } from "./OfframpProviderCard";
import { ShakepayGuide } from "./ShakepayGuide";
import { OnramperWidget } from "./OnramperWidget";

interface MerchantData {
  id: string;
  wallet_address?: string;
  settlement_chain?: string;
  settlement_token?: string;
  offramp_provider?: string;
  offramp_currency?: string;
  shakepay_deposit_address?: string;
  currency?: string;
}

export function OfframpContent({ merchant }: { merchant: MerchantData }) {
  const searchParams = useSearchParams();
  const cbStatus = searchParams.get("cb_status");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);

  const defaultTab = merchant.offramp_provider || "coinbase";

  async function handleCoinbaseCashOut() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/internal/offramp/coinbase", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Failed to start Coinbase offramp");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  async function handleSaveShakepayAddress(address: string) {
    setSavingAddress(true);
    try {
      const res = await fetch("/api/v1/internal/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shakepay_deposit_address: address }),
      });

      if (!res.ok) throw new Error("Failed to save address");
    } catch {
      // silently fail — address is optional
    } finally {
      setSavingAddress(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Coinbase callback status */}
      {cbStatus === "success" && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Check className="h-5 w-5 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300">
            Coinbase offramp completed successfully. Funds are being processed to
            your bank account.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-400/10 border border-red-500/20">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {!merchant.wallet_address && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="text-sm text-amber-300">
            You need a wallet address configured before using offramp.{" "}
            <a
              href="/dashboard/settings/settlement"
              className="underline hover:text-amber-200"
            >
              Set up in Settlement Settings
            </a>
          </div>
        </div>
      )}

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="bg-zinc-800/50 border border-zinc-700/50">
          <TabsTrigger value="coinbase" className="gap-2 data-[state=active]:bg-zinc-700">
            <Landmark className="h-4 w-4" />
            Coinbase
          </TabsTrigger>
          <TabsTrigger value="shakepay" className="gap-2 data-[state=active]:bg-zinc-700">
            <DollarSign className="h-4 w-4" />
            Shakepay
          </TabsTrigger>
          <TabsTrigger value="onramper" className="gap-2 data-[state=active]:bg-zinc-700">
            <Globe className="h-4 w-4" />
            Onramper
          </TabsTrigger>
        </TabsList>

        {/* Coinbase */}
        <TabsContent value="coinbase">
          <OfframpProviderCard
            name="Coinbase"
            icon={Landmark}
            description="0% fees for USDC"
            features={[
              "Best for US & Canadian merchants",
              "Supports USDC on Base, Ethereum, Solana, Polygon",
              "Payout via ACH (US), EFT (Canada), or PayPal",
              "0% conversion fees for USDC",
              "Requires a Coinbase account (they handle KYC)",
            ]}
            recommended
            region="US & Canada"
            actionLabel={loading ? "Redirecting..." : "Cash Out with Coinbase"}
            onSelect={handleCoinbaseCashOut}
            disabled={loading || !merchant.wallet_address}
          />
        </TabsContent>

        {/* Shakepay */}
        <TabsContent value="shakepay">
          <OfframpProviderCard
            name="Shakepay"
            icon={DollarSign}
            description="Instant Interac e-Transfer"
            features={[
              "Best for Canadian merchants wanting CAD",
              "Instant Interac e-Transfer to your bank",
              "USDC to CAD at near 1:1 rate",
              "Only supports USDC on Ethereum (ERC-20)",
            ]}
            region="Canada"
            actionLabel=""
            onSelect={() => {}}
          >
            <ShakepayGuide
              savedAddress={merchant.shakepay_deposit_address ?? undefined}
              onSaveAddress={handleSaveShakepayAddress}
              saving={savingAddress}
            />
          </OfframpProviderCard>
        </TabsContent>

        {/* Onramper */}
        <TabsContent value="onramper">
          <Card className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg">Onramper</h3>
                  <p className="text-sm text-zinc-400">
                    190+ countries supported
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-xs text-zinc-400 border-zinc-700"
              >
                Global
              </Badge>
            </div>

            <ul className="space-y-2">
              {[
                "Best for international merchants",
                "Supports 190+ countries and multiple payout methods",
                "Full KYC and payment handling built into the widget",
                "Sell USDC for your local fiat currency",
              ].map((f, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-zinc-300"
                >
                  <span className="text-blue-400 mt-0.5 shrink-0">&#8226;</span>
                  {f}
                </li>
              ))}
            </ul>

            <OnramperWidget
              defaultFiat={merchant.offramp_currency || merchant.currency || "USD"}
              walletAddress={merchant.wallet_address}
            />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick links */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">
            Configure your preferred offramp provider and currency in settings.
          </p>
          <Button variant="ghost" size="sm" asChild>
            <a href="/dashboard/settings/settlement">
              Offramp Settings
              <ChevronRight className="h-4 w-4 ml-1" />
            </a>
          </Button>
        </div>
      </Card>
    </div>
  );
}
