"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  Building2,
  Wallet,
  Settings,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Zap,
  ExternalLink,
  ShoppingCart,
  LayoutDashboard,
  AlertCircle,
  Sparkles,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type Tier = "quick_start" | "byoe" | "byow" | "custom";

const STEP_LABELS = [
  "Welcome",
  "Setup Type",
  "Configure",
  "Business",
  "API Keys",
  "Ready",
];

const CURRENCIES = [
  "USD", "CAD", "EUR", "GBP", "AUD", "JPY", "CHF", "SEK", "NOK", "DKK",
  "NZD", "SGD", "HKD", "KRW", "MXN", "BRL", "INR", "TRY", "PLN", "ZAR",
] as const;

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

const EXCHANGES = [
  { id: "coinbase", name: "Coinbase", chain: "base", token: "USDC" },
  { id: "kraken", name: "Kraken", chain: "ethereum", token: "USDC" },
  { id: "shakepay", name: "Shakepay", chain: "ethereum", token: "ETH" },
  { id: "newton", name: "Newton", chain: "ethereum", token: "ETH" },
  { id: "robinhood", name: "Robinhood", chain: "ethereum", token: "USDC" },
  { id: "binance", name: "Binance", chain: "ethereum", token: "USDC" },
  { id: "bybit", name: "Bybit", chain: "arbitrum", token: "USDC" },
  { id: "crypto.com", name: "Crypto.com", chain: "ethereum", token: "USDC" },
  { id: "gemini", name: "Gemini", chain: "ethereum", token: "USDC" },
] as const;

const EVM_CHAINS = ["base", "ethereum", "arbitrum", "optimism", "polygon"];

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

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

function detectChainFromAddress(addr: string): string | null {
  if (isSuiAddress(addr)) return "sui";
  if (isEvmAddress(addr)) return "evm"; // needs further selection
  if (isSolanaAddress(addr)) return "solana";
  if (isNearAddress(addr)) return "near";
  return null;
}

function isValidAddress(addr: string, chain: string): boolean {
  if (EVM_CHAINS.includes(chain)) return isEvmAddress(addr);
  if (chain === "solana") return isSolanaAddress(addr);
  if (chain === "near") return isNearAddress(addr);
  if (chain === "sui") return isSuiAddress(addr);
  return false;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnboardingWizardProps {
  merchantId: string;
  businessName: string;
  currentCurrency: string;
  currentTimezone: string;
  alreadyCompleted: boolean;
}

interface FormData {
  tier: Tier | null;
  walletAddress: string;
  settlementChain: string;
  settlementToken: string;
  exchangeName: string;
  currency: string;
  timezone: string;
  evmChain: string; // for BYOW when address is EVM
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function OnboardingWizard({
  merchantId,
  businessName,
  currentCurrency,
  currentTimezone,
  alreadyCompleted,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    tier: null,
    walletAddress: "",
    settlementChain: "base",
    settlementToken: "USDC",
    exchangeName: "",
    currency: currentCurrency || "USD",
    timezone: currentTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    evmChain: "base",
  });

  const [liveKey, setLiveKey] = useState<string | null>(null);
  const [testKey, setTestKey] = useState<string | null>(null);
  const [keysGenerated, setKeysGenerated] = useState(false);
  const [copiedLive, setCopiedLive] = useState(false);
  const [copiedTest, setCopiedTest] = useState(false);

  const update = useCallback(
    (partial: Partial<FormData>) =>
      setFormData((prev) => ({ ...prev, ...partial })),
    []
  );

  // Auto-detect timezone
  useEffect(() => {
    if (!currentTimezone || currentTimezone === "UTC") {
      update({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    }
  }, [currentTimezone, update]);

  // ---------- Navigation ----------

  function canAdvance(): boolean {
    switch (step) {
      case 1:
        return formData.tier !== null;
      case 2:
        return isConfigValid();
      case 3:
        return !!formData.currency;
      default:
        return true;
    }
  }

  function isConfigValid(): boolean {
    switch (formData.tier) {
      case "quick_start":
        return true; // no user input needed
      case "byoe":
        return (
          !!formData.exchangeName &&
          !!formData.walletAddress &&
          isValidAddress(formData.walletAddress, formData.settlementChain)
        );
      case "byow": {
        const detected = detectChainFromAddress(formData.walletAddress);
        if (!detected) return false;
        if (detected === "evm")
          return !!formData.evmChain && isEvmAddress(formData.walletAddress);
        return true;
      }
      case "custom":
        return (
          !!formData.settlementChain &&
          !!formData.settlementToken &&
          !!formData.walletAddress &&
          isValidAddress(formData.walletAddress, formData.settlementChain)
        );
      default:
        return false;
    }
  }

  async function handleNext() {
    if (step < 5) {
      // When leaving step 4 (Business Details), save onboarding
      if (step === 3) {
        setLoading(true);
        setError(null);
        try {
          await saveOnboarding();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save settings");
          setLoading(false);
          return;
        }
        setLoading(false);
      }

      // When entering step 4 (API Keys), generate keys
      if (step === 3 && !keysGenerated) {
        setLoading(true);
        try {
          await generateKeys();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to generate API keys");
          setLoading(false);
          // Still advance — keys can be generated later in settings
        }
        setLoading(false);
      }

      setStep((s) => s + 1);
    }
  }

  function handleBack() {
    if (step > 0) {
      setError(null);
      setStep((s) => s - 1);
    }
  }

  // ---------- API calls ----------

  async function saveOnboarding() {
    const payload: Record<string, unknown> = {
      tier: formData.tier,
      settlement_chain: formData.settlementChain,
      settlement_token: formData.settlementToken,
      currency: formData.currency,
      timezone: formData.timezone,
    };

    if (formData.tier === "quick_start") {
      payload.settlement_chain = "base";
      payload.settlement_token = "USDC";
    } else {
      payload.wallet_address = formData.walletAddress;
    }

    if (formData.tier === "byoe") {
      payload.exchange_name = formData.exchangeName;
    }

    const res = await fetch("/api/v1/internal/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data?.error?.message || "Failed to save onboarding");
    }
  }

  async function generateKeys() {
    // Generate live key
    const liveRes = await fetch("/api/v1/internal/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantId,
        label: "Onboarding — Live",
        isTest: false,
      }),
    });

    if (liveRes.ok) {
      const liveData = await liveRes.json();
      setLiveKey(liveData.apiKey);
    }

    // Generate test key
    const testRes = await fetch("/api/v1/internal/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantId,
        label: "Onboarding — Test",
        isTest: true,
      }),
    });

    if (testRes.ok) {
      const testData = await testRes.json();
      setTestKey(testData.apiKey);
    }

    setKeysGenerated(true);
  }

  async function copyToClipboard(text: string, type: "live" | "test") {
    await navigator.clipboard.writeText(text);
    if (type === "live") {
      setCopiedLive(true);
      setTimeout(() => setCopiedLive(false), 2000);
    } else {
      setCopiedTest(true);
      setTimeout(() => setCopiedTest(false), 2000);
    }
  }

  // ---------- Fire confetti ----------

  async function fireConfetti() {
    try {
      const confetti = (await import("canvas-confetti")).default;
      // First burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#2563EB", "#7C3AED", "#3B82F6", "#8B5CF6", "#60A5FA"],
      });
      // Second burst after brief delay
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 100,
          origin: { y: 0.5, x: 0.3 },
          colors: ["#2563EB", "#7C3AED", "#3B82F6", "#8B5CF6"],
        });
        confetti({
          particleCount: 50,
          spread: 100,
          origin: { y: 0.5, x: 0.7 },
          colors: ["#2563EB", "#7C3AED", "#3B82F6", "#8B5CF6"],
        });
      }, 200);
    } catch {
      // Confetti is non-critical
    }
  }

  // Trigger confetti when reaching final step
  useEffect(() => {
    if (step === 5) {
      fireConfetti();
    }
  }, [step]);

  // ---------- BYOW auto-detection ----------

  function handleByowAddressChange(address: string) {
    update({ walletAddress: address });
    const detected = detectChainFromAddress(address);
    if (detected === "solana") {
      update({ settlementChain: "solana", settlementToken: "USDC" });
    } else if (detected === "near") {
      update({ settlementChain: "near", settlementToken: "NEAR" });
    } else if (detected === "sui") {
      update({ settlementChain: "sui", settlementToken: "USDC" });
    } else if (detected === "evm") {
      update({ settlementChain: formData.evmChain });
    }
  }

  // ---------- BYOE exchange selection ----------

  function handleExchangeSelect(exchangeId: string) {
    const exchange = EXCHANGES.find((e) => e.id === exchangeId);
    if (exchange) {
      update({
        exchangeName: exchange.id,
        settlementChain: exchange.chain,
        settlementToken: exchange.token,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-white">goBlink</span>
          <span className="text-xs text-zinc-500">Merchant</span>
        </div>
        {alreadyCompleted && (
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Back to Dashboard
          </Link>
        )}
      </header>

      {/* Progress bar */}
      {step > 0 && step < 5 && (
        <div className="px-6 pt-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              {STEP_LABELS.slice(1, 5).map((label, i) => (
                <div
                  key={label}
                  className="flex items-center gap-2 text-xs font-medium"
                >
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      i + 1 < step
                        ? "bg-blue-600 text-white"
                        : i + 1 === step
                          ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white"
                          : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {i + 1 < step ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`hidden sm:inline ${
                      i + 1 <= step ? "text-zinc-300" : "text-zinc-600"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-violet-600 rounded-full transition-all duration-500"
                style={{ width: `${((step - 1) / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div key={step} className="w-full max-w-2xl animate-fade-in-up">
          {step === 0 && <StepWelcome businessName={businessName} onContinue={() => setStep(1)} />}
          {step === 1 && (
            <StepChooseTier
              selected={formData.tier}
              onSelect={(tier) => update({ tier })}
            />
          )}
          {step === 2 && (
            <StepConfigure
              tier={formData.tier!}
              formData={formData}
              update={update}
              onExchangeSelect={handleExchangeSelect}
              onByowAddressChange={handleByowAddressChange}
            />
          )}
          {step === 3 && (
            <StepBusinessDetails
              currency={formData.currency}
              timezone={formData.timezone}
              update={update}
            />
          )}
          {step === 4 && (
            <StepApiKeys
              liveKey={liveKey}
              testKey={testKey}
              copiedLive={copiedLive}
              copiedTest={copiedTest}
              onCopy={copyToClipboard}
            />
          )}
          {step === 5 && <StepDone />}

          {/* Error message */}
          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-400 bg-red-400/10 rounded-lg px-4 py-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Navigation buttons */}
          {step > 0 && step < 5 && (
            <div className="flex items-center justify-between mt-8">
              <Button variant="ghost" onClick={handleBack} disabled={loading}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext} disabled={!canAdvance() || loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : step === 4 ? (
                  <>
                    Finish Setup
                    <Sparkles className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
          {step === 5 && (
            <div className="mt-8 text-center">
              <Button
                size="lg"
                onClick={() => router.push("/dashboard")}
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1: Welcome
// ---------------------------------------------------------------------------

function StepWelcome({
  businessName,
  onContinue,
}: {
  businessName: string;
  onContinue: () => void;
}) {
  return (
    <div className="text-center space-y-6">
      <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 items-center justify-center mx-auto">
        <Zap className="h-8 w-8 text-white" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">
          Welcome to goBlink Merchant, {businessName}!
        </h1>
        <p className="text-lg text-zinc-400 max-w-md mx-auto">
          Let&apos;s set up how you&apos;ll receive payments. This takes about 60
          seconds.
        </p>
      </div>
      <Button size="lg" onClick={onContinue}>
        Get Started
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Choose Tier
// ---------------------------------------------------------------------------

const TIER_OPTIONS: {
  id: Tier;
  title: string;
  description: string;
  icon: typeof Shield;
  recommended?: boolean;
}[] = [
  {
    id: "quick_start",
    title: "Quick Start",
    description:
      "We create a smart wallet for you on Base. No crypto experience needed.",
    icon: Shield,
    recommended: true,
  },
  {
    id: "byoe",
    title: "Bring Your Own Exchange (BYOE)",
    description:
      "Already have Coinbase, Kraken, or Shakepay? Route payments directly there.",
    icon: Building2,
  },
  {
    id: "byow",
    title: "Bring Your Own Wallet (BYOW)",
    description:
      "Have MetaMask, Phantom, or another wallet? Connect it. Any chain, any wallet.",
    icon: Wallet,
  },
  {
    id: "custom",
    title: "Custom Setup",
    description:
      "Pick your exact chain, token, and wallet. For crypto natives.",
    icon: Settings,
  },
];

function StepChooseTier({
  selected,
  onSelect,
}: {
  selected: Tier | null;
  onSelect: (tier: Tier) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">
          Choose Your Setup
        </h2>
        <p className="text-zinc-400">
          How do you want to receive crypto payments?
        </p>
      </div>

      <div className="grid gap-3">
        {TIER_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              className={`relative w-full text-left rounded-xl border p-4 transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/50"
                  : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected
                      ? "bg-blue-600/20 text-blue-400"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {option.title}
                    </span>
                    {option.recommended && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-blue-600 to-violet-600 text-white px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">
                    {option.description}
                  </p>
                </div>
                <div
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected
                      ? "border-blue-500 bg-blue-500"
                      : "border-zinc-600"
                  }`}
                >
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Configure
// ---------------------------------------------------------------------------

function StepConfigure({
  tier,
  formData,
  update,
  onExchangeSelect,
  onByowAddressChange,
}: {
  tier: Tier;
  formData: FormData;
  update: (partial: Partial<FormData>) => void;
  onExchangeSelect: (id: string) => void;
  onByowAddressChange: (addr: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">
          {tier === "quick_start" && "Quick Start Setup"}
          {tier === "byoe" && "Exchange Setup"}
          {tier === "byow" && "Wallet Setup"}
          {tier === "custom" && "Custom Setup"}
        </h2>
        <p className="text-zinc-400">
          {tier === "quick_start" && "Your smart wallet will be ready in seconds."}
          {tier === "byoe" && "Route payments to your exchange account."}
          {tier === "byow" && "Receive payments to your own wallet."}
          {tier === "custom" && "Configure your exact settlement preferences."}
        </p>
      </div>

      <Card className="p-6">
        {tier === "quick_start" && <ConfigQuickStart />}
        {tier === "byoe" && (
          <ConfigBYOE
            formData={formData}
            onExchangeSelect={onExchangeSelect}
            update={update}
          />
        )}
        {tier === "byow" && (
          <ConfigBYOW
            formData={formData}
            update={update}
            onAddressChange={onByowAddressChange}
          />
        )}
        {tier === "custom" && <ConfigCustom formData={formData} update={update} />}
      </Card>
    </div>
  );
}

// --- Quick Start ---

function ConfigQuickStart() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <Shield className="h-5 w-5 text-blue-400 shrink-0" />
        <div className="text-sm">
          <p className="text-blue-300 font-medium">
            Base Network + USDC Settlement
          </p>
          <p className="text-blue-300/70 mt-0.5">
            Cheapest fees, native USDC support. Payments settle automatically.
          </p>
        </div>
      </div>
      <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Network</span>
          <span className="text-white font-medium">Base</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Settlement Token</span>
          <span className="text-white font-medium">USDC</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Wallet Type</span>
          <span className="text-white font-medium">Smart Wallet (Passkey)</span>
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        Smart wallet setup coming soon — using default Base USDC settlement for
        now. Your wallet will be upgraded automatically when available.
      </p>
    </div>
  );
}

// --- BYOE ---

function ConfigBYOE({
  formData,
  onExchangeSelect,
  update,
}: {
  formData: FormData;
  onExchangeSelect: (id: string) => void;
  update: (partial: Partial<FormData>) => void;
}) {
  const selectedExchange = EXCHANGES.find(
    (e) => e.id === formData.exchangeName
  );
  const chain = selectedExchange
    ? CHAINS[selectedExchange.chain]
    : null;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select your exchange</Label>
        <Select value={formData.exchangeName} onValueChange={onExchangeSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Choose an exchange..." />
          </SelectTrigger>
          <SelectContent>
            {EXCHANGES.map((ex) => (
              <SelectItem key={ex.id} value={ex.id}>
                {ex.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedExchange && chain && (
        <>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <Building2 className="h-5 w-5 text-violet-400 shrink-0" />
            <p className="text-sm text-violet-300">
              Recommended: <span className="font-medium">{selectedExchange.token}</span> on{" "}
              <span className="font-medium">{chain.name}</span> for{" "}
              {selectedExchange.name}
            </p>
          </div>

          <div className="space-y-2">
            <Label>
              Paste your {selectedExchange.name} deposit address for{" "}
              {selectedExchange.token} on {chain.name}
            </Label>
            <Input
              placeholder={
                EVM_CHAINS.includes(selectedExchange.chain)
                  ? "0x..."
                  : "Enter deposit address"
              }
              value={formData.walletAddress}
              onChange={(e) => update({ walletAddress: e.target.value.trim() })}
            />
            {formData.walletAddress &&
              !isValidAddress(
                formData.walletAddress,
                selectedExchange.chain
              ) && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Invalid address format for {chain.name}
                </p>
              )}
          </div>
        </>
      )}
    </div>
  );
}

// --- BYOW ---

function ConfigBYOW({
  formData,
  update,
  onAddressChange,
}: {
  formData: FormData;
  update: (partial: Partial<FormData>) => void;
  onAddressChange: (addr: string) => void;
}) {
  const detected = formData.walletAddress
    ? detectChainFromAddress(formData.walletAddress)
    : null;

  const effectiveChain =
    detected === "evm" ? formData.evmChain : detected || "";
  const tokens = effectiveChain ? CHAINS[effectiveChain]?.tokens : [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Enter your wallet address</Label>
        <Input
          placeholder="0x... or Solana/NEAR/Sui address"
          value={formData.walletAddress}
          onChange={(e) => onAddressChange(e.target.value.trim())}
        />
        {formData.walletAddress && !detected && (
          <p className="text-xs text-amber-400 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Could not detect chain from address format
          </p>
        )}
        {detected && detected !== "evm" && (
          <p className="text-xs text-emerald-400">
            Detected: {CHAINS[detected]?.name}
          </p>
        )}
      </div>

      {detected === "evm" && (
        <div className="space-y-2">
          <Label>Select EVM chain</Label>
          <Select
            value={formData.evmChain}
            onValueChange={(val) => {
              update({ evmChain: val, settlementChain: val });
              // Reset token to USDC for new chain
              update({ settlementToken: "USDC" });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVM_CHAINS.map((c) => (
                <SelectItem key={c} value={c}>
                  {CHAINS[c].name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {effectiveChain && tokens && tokens.length > 0 && (
        <div className="space-y-2">
          <Label>Settlement token</Label>
          <Select
            value={formData.settlementToken}
            onValueChange={(val) => update({ settlementToken: val })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tokens.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// --- Custom ---

function ConfigCustom({
  formData,
  update,
}: {
  formData: FormData;
  update: (partial: Partial<FormData>) => void;
}) {
  const chainTokens = CHAINS[formData.settlementChain]?.tokens || [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Chain</Label>
        <Select
          value={formData.settlementChain}
          onValueChange={(val) => {
            const newTokens = CHAINS[val]?.tokens || [];
            update({
              settlementChain: val,
              settlementToken: newTokens[0] || "USDC",
              walletAddress: "",
            });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CHAINS).map(([key, chain]) => (
              <SelectItem key={key} value={key}>
                {chain.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Token</Label>
        <Select
          value={formData.settlementToken}
          onValueChange={(val) => update({ settlementToken: val })}
        >
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
        <Label>Wallet address</Label>
        <Input
          placeholder={
            EVM_CHAINS.includes(formData.settlementChain)
              ? "0x..."
              : formData.settlementChain === "solana"
                ? "Solana address"
                : formData.settlementChain === "near"
                  ? "account.near"
                  : formData.settlementChain === "sui"
                    ? "0x (64 hex chars)"
                    : "Wallet address"
          }
          value={formData.walletAddress}
          onChange={(e) => update({ walletAddress: e.target.value.trim() })}
        />
        {formData.walletAddress &&
          !isValidAddress(
            formData.walletAddress,
            formData.settlementChain
          ) && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Invalid address format for{" "}
              {CHAINS[formData.settlementChain]?.name}
            </p>
          )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Business Details
// ---------------------------------------------------------------------------

function StepBusinessDetails({
  currency,
  timezone,
  update,
}: {
  currency: string;
  timezone: string;
  update: (partial: Partial<FormData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Business Details</h2>
        <p className="text-zinc-400">
          A few more details to personalize your dashboard.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <Label>Store currency</Label>
          <Select value={currency} onValueChange={(val) => update({ currency: val })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-500">
            Prices shown to customers will be in this currency.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Timezone</Label>
          <Input
            value={timezone}
            onChange={(e) => update({ timezone: e.target.value })}
            placeholder="America/New_York"
          />
          <p className="text-xs text-zinc-500">
            Auto-detected from your browser. Edit if needed.
          </p>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5: API Keys
// ---------------------------------------------------------------------------

function StepApiKeys({
  liveKey,
  testKey,
  copiedLive,
  copiedTest,
  onCopy,
}: {
  liveKey: string | null;
  testKey: string | null;
  copiedLive: boolean;
  copiedTest: boolean;
  onCopy: (text: string, type: "live" | "test") => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Your API Keys</h2>
        <p className="text-zinc-400">
          Use these keys to create payments from your store or app.
        </p>
      </div>

      <div className="space-y-3">
        {/* Live key */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-white">Live Key</span>
            </div>
            {liveKey && (
              <button
                onClick={() => onCopy(liveKey, "live")}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                {copiedLive ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </button>
            )}
          </div>
          {liveKey ? (
            <code className="block text-xs font-mono text-zinc-300 bg-zinc-800/50 rounded-lg p-3 break-all">
              {liveKey}
            </code>
          ) : (
            <p className="text-xs text-zinc-500 italic">
              Key generation failed — you can create one later in Settings.
            </p>
          )}
        </Card>

        {/* Test key */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-sm font-medium text-white">Test Key</span>
            </div>
            {testKey && (
              <button
                onClick={() => onCopy(testKey, "test")}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                {copiedTest ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </button>
            )}
          </div>
          {testKey ? (
            <code className="block text-xs font-mono text-zinc-300 bg-zinc-800/50 rounded-lg p-3 break-all">
              {testKey}
            </code>
          ) : (
            <p className="text-xs text-zinc-500 italic">
              Key generation failed — you can create one later in Settings.
            </p>
          )}
        </Card>
      </div>

      <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-300">
          <p className="font-medium">Save these keys now</p>
          <p className="text-amber-300/70 mt-0.5">
            You won&apos;t be able to see them again. Store them securely.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 6: Done
// ---------------------------------------------------------------------------

function StepDone() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 items-center justify-center mx-auto">
          <Check className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white">
          You&apos;re all set!
        </h2>
        <p className="text-zinc-400 max-w-md mx-auto">
          Your account is configured and ready to accept payments. Here&apos;s
          what to do next:
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/dashboard/links" className="group">
          <Card className="p-4 h-full transition-all group-hover:border-blue-500/50 group-hover:bg-blue-500/5">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
              <ShoppingCart className="h-5 w-5 text-blue-400" />
            </div>
            <h3 className="font-medium text-white text-sm">
              Create a payment link
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Share a link and start getting paid.
            </p>
          </Card>
        </Link>

        <a
          href="https://docs.goblink.io/plugins/woocommerce"
          target="_blank"
          rel="noopener noreferrer"
          className="group"
        >
          <Card className="p-4 h-full transition-all group-hover:border-violet-500/50 group-hover:bg-violet-500/5">
            <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-3">
              <ExternalLink className="h-5 w-5 text-violet-400" />
            </div>
            <h3 className="font-medium text-white text-sm">
              WooCommerce plugin
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Add crypto checkout to your store.
            </p>
          </Card>
        </a>

        <Link href="/dashboard" className="group">
          <Card className="p-4 h-full transition-all group-hover:border-emerald-500/50 group-hover:bg-emerald-500/5">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
              <LayoutDashboard className="h-5 w-5 text-emerald-400" />
            </div>
            <h3 className="font-medium text-white text-sm">
              Explore your dashboard
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              View payments, settings, and more.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
