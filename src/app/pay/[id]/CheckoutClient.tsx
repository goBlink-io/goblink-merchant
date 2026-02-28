"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import dynamic from "next/dynamic";
import {
  ChevronDown,
  Check,
  Clock,
  Loader2,
  ExternalLink,
  AlertCircle,
  Shield,
  Wallet,
  Copy,
  ArrowRight,
  Zap,
} from "lucide-react";
import { useWalletContext } from "@/contexts/WalletContext";
import ConnectWalletModal from "@/components/checkout/ConnectWalletModal";
import { SUPPORTED_CHAINS, type SupportedChain, type ChainType } from "@/lib/chains";
import { isTokenHidden } from "@/lib/token-filters";
import { cn, formatCurrency, truncateAddress } from "@/lib/utils";
import { getExplorerTxUrl } from "@/lib/explorer";

// Dynamic import Web3Provider to avoid SSR issues
const Web3Provider = dynamic(
  () => import("@/components/checkout/Web3Provider"),
  { ssr: false }
);

// --- Types ---

interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  orderId: string | null;
  depositAddress: string;
  returnUrl: string | null;
  metadata: Record<string, unknown>;
  expiresAt: string;
  confirmedAt: string | null;
  createdAt: string;
  sendTxHash: string | null;
  fulfillmentTxHash: string | null;
  customerWallet: string | null;
  customerChain: string | null;
  isTest?: boolean;
}

interface MerchantData {
  businessName: string;
  logoUrl: string | null;
  brandColor: string | null;
  walletAddress: string;
  settlementToken: string | null;
  settlementChain: string | null;
}

interface Token {
  defuse_asset_id: string;
  blockchain: string;
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  icon?: string;
  price_usd?: number;
}

interface QuoteResponse {
  deposit_address?: string;
  amount_in?: string;
  amount_out?: string;
  fee?: string;
  estimated_time?: number;
  [key: string]: unknown;
}

interface CheckoutClientProps {
  paymentId: string;
  initialData: {
    payment: PaymentData;
    merchant: MerchantData | null;
  };
}

// --- Main component (wraps with Web3Provider) ---

export default function CheckoutClient(props: CheckoutClientProps) {
  return (
    <Web3Provider>
      <CheckoutInner {...props} />
      <ConnectWalletModal />
    </Web3Provider>
  );
}

// --- Inner checkout component ---

type CheckoutStep = "select" | "confirm" | "processing" | "success" | "failed";

function CheckoutInner({ paymentId, initialData }: CheckoutClientProps) {
  const { payment: initialPayment, merchant } = initialData;
  const [payment, setPayment] = useState<PaymentData>(initialPayment);
  const [step, setStep] = useState<CheckoutStep>(() => {
    if (initialPayment.status === "confirmed") return "success";
    if (initialPayment.status === "processing") return "processing";
    if (initialPayment.status === "failed") return "failed";
    if (initialPayment.status === "refunded") return "failed";
    if (initialPayment.status === "expired") return "failed";
    return "select";
  });

  // Chain & token selection
  const [selectedChain, setSelectedChain] = useState<SupportedChain>(SUPPORTED_CHAINS[4]); // Default Ethereum
  const [chainAutoDetected, setChainAutoDetected] = useState(false);
  const [chainDropdownOpen, setChainDropdownOpen] = useState(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [tokenDropdownOpen, setTokenDropdownOpen] = useState(false);
  const [tokensLoading, setTokensLoading] = useState(true);

  // Quote
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Transfer
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [txSubmitting, setTxSubmitting] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Polling
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [fundsDetected, setFundsDetected] = useState(false);

  // Wallet
  const {
    isChainConnected,
    getAddressForChain,
    connectWallet,
  } = useWalletContext();

  const walletConnected = isChainConnected(selectedChain.type);
  const walletAddress = getAddressForChain(selectedChain.type);

  // --- Test mode simulation ---
  const isTest = initialPayment.isTest === true;
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  const handleSimulate = async () => {
    setSimulating(true);
    setSimError(null);
    try {
      const res = await fetch(`/api/checkout/${paymentId}/simulate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setSimError(data?.error?.message || "Simulation failed");
        setSimulating(false);
        return;
      }
      // Update local state to reflect confirmed
      setPayment((prev) => ({
        ...prev,
        status: "confirmed",
        fulfillmentTxHash: data.txHash,
        confirmedAt: new Date().toISOString(),
      }));
      setStep("success");
    } catch {
      setSimError("Network error during simulation");
    } finally {
      setSimulating(false);
    }
  };

  // --- Auto-detect chain from connected wallet ---
  useEffect(() => {
    if (chainAutoDetected) return;
    for (const chain of SUPPORTED_CHAINS) {
      if (isChainConnected(chain.type)) {
        setSelectedChain(chain);
        setChainAutoDetected(true);
        setSelectedToken(null);
        break;
      }
    }
  }, [chainAutoDetected, isChainConnected]);

  // --- Fetch tokens ---
  useEffect(() => {
    let cancelled = false;
    setTokensLoading(true);

    fetch("/api/checkout/tokens")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const allTokens: Token[] = Array.isArray(data) ? data : data?.tokens ?? [];
        setTokens(allTokens);
        setTokensLoading(false);
      })
      .catch(() => {
        if (!cancelled) setTokensLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // Filter tokens by selected chain
  const filteredTokens = tokens.filter((t) => {
    const bc = t.blockchain?.toLowerCase() || "";
    const chainId = selectedChain.id.toLowerCase();
    if (!bc.includes(chainId) && chainId !== mapBlockchain(bc)) return false;
    if (isTokenHidden(t.symbol)) return false;
    return true;
  });

  // Auto-select first token when chain changes
  useEffect(() => {
    if (filteredTokens.length > 0 && !filteredTokens.find((t) => t.defuse_asset_id === selectedToken?.defuse_asset_id)) {
      // Prefer USDC/USDT
      const stable = filteredTokens.find(
        (t) => t.symbol === "USDC" || t.symbol === "USDT"
      );
      setSelectedToken(stable || filteredTokens[0]);
    }
  }, [filteredTokens, selectedToken?.defuse_asset_id]);

  // --- Build destination asset ID ---
  const destinationAssetId = merchant?.settlementToken
    ? buildDestAsset(merchant.settlementChain, merchant.settlementToken)
    : null;

  // --- Get quote ---
  const fetchQuote = useCallback(async () => {
    if (!selectedToken || !walletAddress || !destinationAssetId) return;

    setQuoteLoading(true);
    setQuoteError(null);

    try {
      const res = await fetch("/api/checkout/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originAsset: selectedToken.defuse_asset_id,
          destinationAsset: destinationAssetId,
          amount: toMinorUnits(payment.amount, payment.currency),
          recipient: merchant?.walletAddress || payment.depositAddress,
          refundTo: walletAddress,
          swapType: "EXACT_OUTPUT",
          dryRun: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setQuoteError(data?.error?.message || "Failed to get quote");
      } else {
        setQuote(data);
      }
    } catch {
      setQuoteError("Network error getting quote");
    } finally {
      setQuoteLoading(false);
    }
  }, [selectedToken, walletAddress, destinationAssetId, payment.amount, payment.currency, payment.depositAddress, merchant?.walletAddress]);

  // Auto-refresh quote when token/chain changes
  useEffect(() => {
    if (step === "select" && walletConnected && selectedToken && destinationAssetId) {
      fetchQuote();
    }
  }, [step, walletConnected, selectedToken, destinationAssetId, fetchQuote]);

  // --- Expiry countdown ---
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!payment.expiresAt) return;

    function updateCountdown() {
      const diff = new Date(payment.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        setIsExpired(true);
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    }

    updateCountdown();
    const iv = setInterval(updateCountdown, 1000);
    return () => clearInterval(iv);
  }, [payment.expiresAt]);

  // --- Pay action ---
  const handlePay = async () => {
    if (!selectedToken || !walletAddress || !destinationAssetId) return;
    setTxSubmitting(true);
    setTxError(null);

    try {
      // Get a live (non-dry) quote
      const res = await fetch("/api/checkout/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originAsset: selectedToken.defuse_asset_id,
          destinationAsset: destinationAssetId,
          amount: toMinorUnits(payment.amount, payment.currency),
          recipient: merchant?.walletAddress || payment.depositAddress,
          refundTo: walletAddress,
          swapType: "EXACT_OUTPUT",
          dryRun: false,
        }),
      });

      const liveQuote = await res.json();
      if (!res.ok) {
        setTxError(liveQuote?.error?.message || "Failed to get live quote");
        setTxSubmitting(false);
        return;
      }

      const depAddr = liveQuote.deposit_address;
      if (!depAddr) {
        setTxError("No deposit address received");
        setTxSubmitting(false);
        return;
      }

      setDepositAddress(depAddr);
      setQuote(liveQuote);
      setStep("confirm");
      setTxSubmitting(false);
    } catch {
      setTxError("Network error");
      setTxSubmitting(false);
    }
  };

  // --- Confirm transfer (user marks as sent) ---
  const handleConfirmSent = async (txHash: string) => {
    if (!depositAddress || !walletAddress) return;
    setTxSubmitting(true);

    try {
      const res = await fetch(`/api/checkout/${paymentId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sendTxHash: txHash || "pending",
          depositAddress,
          payerAddress: walletAddress,
          payerChain: selectedChain.id,
        }),
      });

      if (res.ok) {
        setStep("processing");
        startPolling();
      } else {
        const data = await res.json();
        setTxError(data?.error?.message || "Failed to submit");
      }
    } catch {
      setTxError("Network error");
    } finally {
      setTxSubmitting(false);
    }
  };

  // --- Poll for completion via lightweight status endpoint ---
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/${paymentId}/status`);
        if (!res.ok) return;
        const data = await res.json();

        setPayment((prev) => ({
          ...prev,
          status: data.status,
          sendTxHash: data.sendTxHash ?? prev.sendTxHash,
          fulfillmentTxHash: data.fulfillmentTxHash ?? prev.fulfillmentTxHash,
          confirmedAt: data.confirmedAt ?? prev.confirmedAt,
          customerChain: data.customerChain ?? prev.customerChain,
        }));

        // Detect intermediate progress — funds received by 1Click
        if (data.sendTxHash && data.sendTxHash !== "pending" && data.sendTxHash !== "user-submitted") {
          setFundsDetected(true);
        }

        if (data.status === "confirmed") {
          setStep("success");
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (data.status === "failed") {
          setStep("failed");
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (data.status === "refunded") {
          setStep("failed");
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (data.status === "expired") {
          setStep("failed");
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // Continue polling
      }
    }, 5000);
  }, [paymentId]);

  // Start polling if we loaded into processing state
  useEffect(() => {
    if (step === "processing") {
      startPolling();
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, startPolling]);

  // --- Copy helper ---
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Render ---

  // Expired / Not found
  if (payment.status === "expired" || isExpired) {
    return (
      <Card merchant={merchant} isTest={isTest}>
        <div className="flex flex-col items-center text-center py-8">
          <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">Payment Expired</h2>
          <p className="text-sm text-zinc-400 mb-6">
            This payment link has expired. Please request a new one from the merchant.
          </p>
          {payment.returnUrl && (
            <a
              href={payment.returnUrl}
              className="text-sm text-blue-400 hover:text-blue-300 underline"
            >
              Return to merchant
            </a>
          )}
        </div>
      </Card>
    );
  }

  // Success — fire confetti on mount
  const confettiFired = useRef(false);
  useEffect(() => {
    if (step === "success" && !confettiFired.current) {
      confettiFired.current = true;
      const duration = 2000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#10b981", "#3b82f6", "#8b5cf6"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#10b981", "#3b82f6", "#8b5cf6"],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [step]);

  if (step === "success") {
    return (
      <Card merchant={merchant} isTest={isTest}>
        <JourneyStepper current="done" />
        <div className="flex flex-col items-center text-center py-8">
          <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5 animate-in zoom-in duration-500">
            <Check className="h-10 w-10 text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-1">Payment Complete!</h2>
          <p className="text-sm text-zinc-400 mb-1">
            {formatCurrency(payment.amount, payment.currency)} delivered to merchant
          </p>
          <p className="text-xs text-zinc-500 mb-6">
            The merchant has been notified of your payment.
          </p>
          {isTest && (
            <div className="w-full mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-xs text-amber-400 text-center">
                This was a test payment — no real funds were transferred
              </p>
            </div>
          )}
          {payment.fulfillmentTxHash && (
            <div className="w-full p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 mb-4">
              <p className="text-xs text-zinc-500 mb-1">Transaction</p>
              {(() => {
                const chain = payment.customerChain || merchant?.settlementChain;
                const explorerUrl = chain
                  ? getExplorerTxUrl(chain, payment.fulfillmentTxHash)
                  : null;
                return explorerUrl ? (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-blue-400 hover:text-blue-300 break-all inline-flex items-center gap-1"
                  >
                    {payment.fulfillmentTxHash}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <p className="text-xs font-mono text-zinc-300 break-all">
                    {payment.fulfillmentTxHash}
                  </p>
                );
              })()}
            </div>
          )}
          {payment.returnUrl && (
            <a
              href={payment.returnUrl}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium hover:brightness-110 transition-all"
            >
              Return to merchant
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        {/* Trust footer on success too */}
        <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-zinc-500">
          <Shield className="h-3.5 w-3.5" />
          Direct to merchant &middot; We never touch your funds
        </div>
      </Card>
    );
  }

  // Failed / Refunded
  if (step === "failed") {
    const isRefunded = payment.status === "refunded";
    return (
      <Card merchant={merchant} isTest={isTest}>
        <div className="flex flex-col items-center text-center py-8">
          <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">
            {isRefunded ? "Payment Refunded" : "Payment Failed"}
          </h2>
          <p className="text-sm text-zinc-400 mb-2">
            {isRefunded
              ? "Don't worry — your funds have been returned to your wallet automatically."
              : "Something went wrong, but your funds are safe."}
          </p>
          <p className="text-xs text-zinc-500 mb-6">
            {isRefunded
              ? "The refund should appear in your wallet shortly."
              : "If you sent funds, they will be auto-refunded to your wallet. No action needed."}
          </p>
          {payment.returnUrl && (
            <a
              href={payment.returnUrl}
              className="text-sm text-blue-400 hover:text-blue-300 underline"
            >
              Return to merchant
            </a>
          )}
        </div>
      </Card>
    );
  }

  // Processing (waiting for confirmation)
  if (step === "processing") {
    return (
      <Card merchant={merchant} isTest={isTest}>
        <JourneyStepper current="pay" />
        <AmountHeader payment={payment} />
        <div className="flex flex-col items-center text-center py-8">
          <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">
            {fundsDetected ? "Funds detected!" : "Processing Payment"}
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            {fundsDetected
              ? "Your funds are being swapped and delivered. Almost there!"
              : "Your transaction is being processed. This usually takes 1-3 minutes."}
          </p>

          {/* Animated progress bar */}
          <div className="w-full h-1.5 rounded-full bg-zinc-800 mb-6 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-1000 ease-out"
              style={{ width: fundsDetected ? "75%" : "35%" }}
            />
          </div>

          {/* Status timeline */}
          <div className="w-full space-y-3">
            <StatusStep label="Transaction sent" done />
            <StatusStep label="Funds detected" done={fundsDetected} active={!fundsDetected} />
            <StatusStep label="Swap in progress" active={fundsDetected} />
            <StatusStep label="Payment confirmed" />
          </div>
        </div>
      </Card>
    );
  }

  // Confirm step (deposit address shown)
  if (step === "confirm") {
    return (
      <Card merchant={merchant} isTest={isTest}>
        <JourneyStepper current="pay" />
        <AmountHeader payment={payment} />

        <div className="space-y-4 mt-6">
          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <p className="text-xs text-zinc-500 mb-2">Send to this deposit address</p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-mono text-zinc-200 break-all flex-1">
                {depositAddress}
              </p>
              <button
                onClick={() => depositAddress && copyToClipboard(depositAddress)}
                className="shrink-0 p-2 rounded-lg hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {quote?.amount_in && (
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">You send</span>
                <span className="text-zinc-200 font-medium">
                  {formatTokenAmount(quote.amount_in, selectedToken?.decimals)} {selectedToken?.symbol}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-zinc-400">They receive exactly</span>
                <span className="text-zinc-200 font-medium">
                  {formatCurrency(payment.amount, payment.currency)}
                </span>
              </div>
            </div>
          )}

          <p className="text-xs text-zinc-500 text-center">
            Send the exact amount of {selectedToken?.symbol} shown above to the deposit address using your connected wallet.
          </p>

          {txError && (
            <p className="text-xs text-red-400 text-center">{txError}</p>
          )}

          <button
            onClick={() => handleConfirmSent("user-submitted")}
            disabled={txSubmitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-medium hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {txSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                I&apos;ve sent the payment
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </Card>
    );
  }

  // --- Select step (main checkout form) ---
  return (
    <Card merchant={merchant} isTest={isTest}>
      <JourneyStepper current="choose" />
      <AmountHeader payment={payment} />

      {/* Expiry */}
      {payment.expiresAt && (
        <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-zinc-500">
          <Clock className="h-3.5 w-3.5" />
          <span>Expires in {timeLeft}</span>
        </div>
      )}

      {/* Order ID */}
      {payment.orderId && (
        <div className="text-center text-xs text-zinc-500 mt-1">
          Order: {payment.orderId}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {/* Chain selector */}
        <div>
          <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Pay from</label>
          <div className="relative">
            <button
              onClick={() => setChainDropdownOpen(!chainDropdownOpen)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-colors text-sm"
            >
              <span className="text-zinc-200">{selectedChain.name}</span>
              <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", chainDropdownOpen && "rotate-180")} />
            </button>

            {chainDropdownOpen && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl bg-zinc-900 border border-zinc-700 shadow-xl">
                {SUPPORTED_CHAINS.map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => {
                      setSelectedChain(chain);
                      setChainDropdownOpen(false);
                      setSelectedToken(null);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-zinc-800 transition-colors",
                      chain.id === selectedChain.id && "bg-zinc-800 text-blue-400"
                    )}
                  >
                    <span className={chain.id === selectedChain.id ? "text-blue-400" : "text-zinc-200"}>
                      {chain.name}
                    </span>
                    {chain.id === selectedChain.id && <Check className="h-4 w-4 ml-auto text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Token selector */}
        <div>
          <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Pay with</label>
          <div className="relative">
            <button
              onClick={() => setTokenDropdownOpen(!tokenDropdownOpen)}
              disabled={tokensLoading}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-colors text-sm disabled:opacity-50"
            >
              {tokensLoading ? (
                <span className="text-zinc-500 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading tokens...
                </span>
              ) : selectedToken ? (
                <span className="text-zinc-200">{selectedToken.symbol} — {selectedToken.name}</span>
              ) : (
                <span className="text-zinc-500">Select token</span>
              )}
              <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", tokenDropdownOpen && "rotate-180")} />
            </button>

            {tokenDropdownOpen && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl bg-zinc-900 border border-zinc-700 shadow-xl">
                {filteredTokens.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-zinc-500">
                    No tokens available on {selectedChain.name}
                  </div>
                ) : (
                  <>
                    {(() => {
                      const popularSymbols = ["USDC", "USDT", "ETH", "WETH", "SOL", "BTC", "WBTC"];
                      const popular = filteredTokens.filter((t) =>
                        popularSymbols.includes(t.symbol.toUpperCase())
                      );
                      const rest = filteredTokens.filter(
                        (t) => !popularSymbols.includes(t.symbol.toUpperCase())
                      );

                      return (
                        <>
                          {popular.length > 0 && (
                            <>
                              <div className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                                Popular
                              </div>
                              {popular.map((token) => (
                                <TokenOption
                                  key={token.defuse_asset_id}
                                  token={token}
                                  selected={token.defuse_asset_id === selectedToken?.defuse_asset_id}
                                  onSelect={() => {
                                    setSelectedToken(token);
                                    setTokenDropdownOpen(false);
                                  }}
                                />
                              ))}
                            </>
                          )}
                          {rest.length > 0 && (
                            <>
                              {popular.length > 0 && (
                                <div className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600 border-t border-zinc-800 mt-1 pt-1.5">
                                  All tokens
                                </div>
                              )}
                              {rest.map((token) => (
                                <TokenOption
                                  key={token.defuse_asset_id}
                                  token={token}
                                  selected={token.defuse_asset_id === selectedToken?.defuse_asset_id}
                                  onSelect={() => {
                                    setSelectedToken(token);
                                    setTokenDropdownOpen(false);
                                  }}
                                />
                              ))}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quote display */}
        {walletConnected && selectedToken && (
          <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30 space-y-2">
            {quoteLoading ? (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Getting quote...
              </div>
            ) : quoteError ? (
              <div className="text-sm text-red-400 text-center">{quoteError}</div>
            ) : quote ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Estimated cost</span>
                  <span className="text-zinc-200 font-medium">
                    {quote.amount_in
                      ? `${formatTokenAmount(quote.amount_in, selectedToken.decimals)} ${selectedToken.symbol}`
                      : "—"}
                  </span>
                </div>
                {quote.fee && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Network fee</span>
                    <span className="text-zinc-300">{quote.fee}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t border-zinc-700/50">
                  <span className="text-zinc-400">They receive exactly</span>
                  <span className="text-emerald-400 font-medium">
                    {formatCurrency(payment.amount, payment.currency)}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Error messages */}
        {txError && (
          <p className="text-xs text-red-400 text-center">{txError}</p>
        )}

        {/* Action button */}
        {!walletConnected ? (
          <button
            onClick={() => connectWallet(selectedChain.type)}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-medium hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </button>
        ) : (
          <button
            onClick={handlePay}
            disabled={!selectedToken || quoteLoading || !!quoteError || txSubmitting || isExpired}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-medium hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {txSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Pay {formatCurrency(payment.amount, payment.currency)}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        )}

        {/* Auto-refund reassurance */}
        <p className="text-xs text-zinc-500 text-center">
          Auto-refund if transfer fails. No risk.
        </p>

        {/* Connected wallet info */}
        {walletConnected && walletAddress && (
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Connected: {truncateAddress(walletAddress)}
          </div>
        )}
      </div>

      {/* Test mode: Simulate Payment button */}
      {isTest && (
        <div className="mt-6 space-y-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-700/50" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-zinc-900 px-2 text-amber-400/80">Test Mode</span>
            </div>
          </div>
          <button
            onClick={handleSimulate}
            disabled={simulating}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-medium hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {simulating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Simulating payment...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Simulate Payment
              </>
            )}
          </button>
          {simError && (
            <p className="text-xs text-red-400 text-center">{simError}</p>
          )}
          <p className="text-xs text-amber-400/60 text-center">
            Instantly confirms with a fake transaction hash
          </p>
        </div>
      )}

      {/* Trust badge */}
      <div className="flex items-center justify-center gap-1.5 mt-6 text-xs text-zinc-500">
        <Shield className="h-3.5 w-3.5" />
        Direct to merchant &middot; We never touch your funds
      </div>

      {/* How it works */}
      <HowItWorks />
    </Card>
  );
}

// --- Sub-components ---

function Card({
  merchant,
  children,
  isTest,
}: {
  merchant: MerchantData | null;
  children: React.ReactNode;
  isTest?: boolean;
}) {
  return (
    <div className="w-full max-w-md">
      {/* Test mode banner */}
      {isTest && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
          <p className="text-sm font-semibold text-amber-400">
            TEST MODE — No real funds will be transferred
          </p>
        </div>
      )}

      {/* Merchant branding */}
      {merchant && (
        <div className="flex items-center gap-3 mb-6">
          {merchant.logoUrl ? (
            <img
              src={merchant.logoUrl}
              alt={merchant.businessName}
              className="h-10 w-10 rounded-xl object-cover"
            />
          ) : (
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{
                background: merchant.brandColor
                  ? merchant.brandColor
                  : "linear-gradient(135deg, #2563EB, #7C3AED)",
              }}
            >
              {merchant.businessName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-base font-semibold text-zinc-100">
              {merchant.businessName}
            </h1>
            <p className="text-xs text-zinc-500">is requesting payment</p>
          </div>
        </div>
      )}

      <div
        className="rounded-2xl bg-zinc-900/80 border border-zinc-800/80 p-6 shadow-xl backdrop-blur-sm"
        style={
          merchant?.brandColor
            ? { borderTopColor: merchant.brandColor, borderTopWidth: "2px" }
            : undefined
        }
      >
        {children}
      </div>

      {/* Powered by goBlink footer */}
      <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-zinc-600">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" />
        </svg>
        Powered by{" "}
        <span className="font-semibold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
          goBlink
        </span>
      </div>
    </div>
  );
}

function AmountHeader({ payment }: { payment: PaymentData }) {
  const originalCurrency = payment.metadata?.original_currency as string | undefined;
  const originalAmount = payment.metadata?.original_amount as number | undefined;
  const showOriginal = originalCurrency && originalCurrency !== "USD" && originalAmount;

  return (
    <div className="text-center">
      {showOriginal ? (
        <>
          <p className="text-3xl font-bold text-zinc-50 tracking-tight">
            {formatCurrency(originalAmount, originalCurrency)}
          </p>
          <p className="text-sm text-zinc-400 mt-1">
            {formatCurrency(payment.amount, "USD")} USD
          </p>
        </>
      ) : (
        <>
          <p className="text-3xl font-bold text-zinc-50 tracking-tight">
            {formatCurrency(payment.amount, payment.currency)}
          </p>
          <p className="text-sm text-zinc-400 mt-1">{payment.currency}</p>
        </>
      )}
    </div>
  );
}

function HowItWorks() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        <span>How it works</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="mt-3 p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30 space-y-2.5 text-xs text-zinc-400 animate-in slide-in-from-top-2 duration-200">
          <p>
            <span className="text-zinc-300 font-medium">1. Choose</span> — Pick
            which chain and token you want to pay with.
          </p>
          <p>
            <span className="text-zinc-300 font-medium">2. Pay</span> — Send
            tokens to a one-time deposit address. Your tokens are automatically
            swapped and delivered to the merchant.
          </p>
          <p>
            <span className="text-zinc-300 font-medium">3. Done</span> — The
            merchant receives the exact amount in their preferred token. If
            anything goes wrong, you get an automatic refund.
          </p>
        </div>
      )}
    </div>
  );
}

function TokenOption({
  token,
  selected,
  onSelect,
}: {
  token: Token;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-zinc-800 transition-colors",
        selected && "bg-zinc-800 text-blue-400"
      )}
    >
      <div className="flex items-center gap-2">
        <span className={selected ? "text-blue-400" : "text-zinc-200"}>
          {token.symbol}
        </span>
        <span className="text-zinc-500 text-xs">{token.name}</span>
      </div>
      {selected && <Check className="h-4 w-4 text-blue-400" />}
    </button>
  );
}

function JourneyStepper({ current }: { current: "choose" | "pay" | "done" }) {
  const steps = [
    { id: "choose", label: "Choose" },
    { id: "pay", label: "Pay" },
    { id: "done", label: "Done ✓" },
  ] as const;

  const currentIdx = steps.findIndex((s) => s.id === current);

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-medium transition-colors",
              i < currentIdx
                ? "text-emerald-400"
                : i === currentIdx
                  ? "text-blue-400"
                  : "text-zinc-600"
            )}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <ArrowRight
              className={cn(
                "h-3 w-3",
                i < currentIdx ? "text-emerald-400" : "text-zinc-700"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function StatusStep({
  label,
  done,
  active,
}: {
  label: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
          done && "bg-emerald-500/10",
          active && "bg-blue-500/10",
          !done && !active && "bg-zinc-800"
        )}
      >
        {done ? (
          <Check className="h-4 w-4 text-emerald-400" />
        ) : active ? (
          <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
        ) : (
          <div className="h-2 w-2 rounded-full bg-zinc-600" />
        )}
      </div>
      <span
        className={cn(
          "text-sm",
          done && "text-emerald-400",
          active && "text-blue-400",
          !done && !active && "text-zinc-500"
        )}
      >
        {label}
      </span>
    </div>
  );
}

// --- Helpers ---

function mapBlockchain(bc: string): string {
  const map: Record<string, string> = {
    eth: "ethereum",
    "arbitrum-one": "arbitrum",
    "bnb-chain": "bsc",
    "polygon-pos": "polygon",
    "optimism-mainnet": "optimism",
    "base-mainnet": "base",
    sol: "solana",
    "near-mainnet": "near",
    "starknet-mainnet": "starknet",
    "sui-mainnet": "sui",
    "aptos-mainnet": "aptos",
    "tron-mainnet": "tron",
  };
  return map[bc] || bc;
}

function buildDestAsset(chain: string | null, token: string | null): string | null {
  if (!chain || !token) return null;
  // 1Click uses defuse asset IDs like "near:mainnet:native" or "ethereum:mainnet:0x..."
  // This is a simplified builder — actual IDs come from the tokens list
  return `${chain}:mainnet:${token}`;
}

function toMinorUnits(amount: number, _currency: string): string {
  // For stablecoins, amount is already in major units (e.g. 10.50 USDC)
  // Convert to minor units (atoms) — most stablecoins use 6 decimals
  const decimals = 6;
  return Math.round(amount * 10 ** decimals).toString();
}

function formatTokenAmount(amountRaw: string, decimals?: number): string {
  const dec = decimals || 6;
  const num = Number(amountRaw) / 10 ** dec;
  if (num < 0.001) return "<0.001";
  return num.toFixed(Math.min(dec, 4));
}
