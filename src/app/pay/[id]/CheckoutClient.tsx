"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import TokenSelector from "@/components/checkout/TokenSelector";
import ChainSelector from "@/components/checkout/ChainSelector";
import ProcessingStages from "@/components/checkout/ProcessingStages";
import type { StatusData } from "@/components/checkout/ProcessingStages";
import { SUPPORTED_CHAINS, type SupportedChain, type ChainType } from "@/lib/chains";
import { isTokenHidden } from "@/lib/token-filters";
import { cn, formatCurrency, truncateAddress } from "@/lib/utils";
import { getExplorerTxUrl } from "@/lib/explorer";
import { useTokenBalances, getAutoSelectedToken, type TokenWithBalance } from "@/hooks/useTokenBalances";
import { useChainBalances } from "@/hooks/useChainBalances";
import { useAutoSend } from "@/hooks/useAutoSend";
// P2-E: Checkout polish imports
import PaymentReceipt from "@/components/checkout/PaymentReceipt";
import CustomerEmailInput from "@/components/checkout/CustomerEmailInput";
import MobileWalletConnect from "@/components/checkout/MobileWalletConnect";
import QRPayment, { QRTabSwitcher } from "@/components/checkout/QRPayment";

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

interface CustomCheckoutField {
  label: string;
  type: "text" | "email" | "textarea" | "select";
  required: boolean;
  options?: string[];
}

interface MerchantData {
  businessName: string;
  logoUrl: string | null;
  brandColor: string | null;
  walletAddress: string;
  settlementToken: string | null;
  settlementChain: string | null;
  showPoweredBadge?: boolean;
  customCheckoutFields?: CustomCheckoutField[];
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

type CheckoutStep = "select" | "processing" | "success" | "failed";

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
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
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

  // Failure tracking
  const [failureReason, setFailureReason] = useState<string | null>(null);

  // Manual fallback mode
  const [showManualFlow, setShowManualFlow] = useState(false);

  // Wallet
  const {
    isChainConnected,
    getAddressForChain,
    connectWallet,
  } = useWalletContext();

  const walletConnected = isChainConnected(selectedChain.type);
  const walletAddress = getAddressForChain(selectedChain.type);
  const isEvmChain = selectedChain.type === "evm";

  // --- Test mode simulation ---
  const isTest = initialPayment.isTest === true;
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  // P2-E: Customer email state
  const [customerEmail, setCustomerEmail] = useState("");
  const [wantReceipt, setWantReceipt] = useState(true);

  // P2-E: QR payment tab state
  const [paymentTab, setPaymentTab] = useState<"wallet" | "qr">(
    // Default to QR if no wallet connected
    "wallet"
  );

  // HXF 3.4: Custom checkout fields
  const customFields = merchant?.customCheckoutFields ?? [];
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

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

  // --- Chain balances (multi-chain auto-detect) ---
  const {
    chainBalances,
    chainsWithBalance,
    bestChain,
    allLoaded: chainBalancesLoaded,
  } = useChainBalances({
    walletAddress,
    enabled: walletConnected && isEvmChain,
  });

  // Auto-detect best chain from balances
  useEffect(() => {
    if (!chainAutoDetected && isEvmChain && bestChain && chainBalancesLoaded) {
      const chain = SUPPORTED_CHAINS.find((c) => c.id === bestChain.chainId);
      if (chain) {
        setSelectedChain(chain);
        setChainAutoDetected(true);
        setSelectedToken(null);
      }
    }
  }, [chainAutoDetected, isEvmChain, bestChain, chainBalancesLoaded]);

  // --- Auto-detect chain from connected wallet (fallback for non-EVM) ---
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
  const filteredTokens = useMemo(() => {
    return tokens.filter((t) => {
      const bc = t.blockchain?.toLowerCase() || "";
      const chainId = selectedChain.id.toLowerCase();
      if (!bc.includes(chainId) && chainId !== mapBlockchain(bc)) return false;
      if (isTokenHidden(t.symbol)) return false;
      return true;
    });
  }, [tokens, selectedChain.id]);

  // --- Token balances ---
  const { tokensWithBalances, loading: balancesLoading } = useTokenBalances({
    tokens: filteredTokens,
    requiredAmountUsd: payment.amount, // payment.amount is in USD (or equivalent)
    walletAddress,
    chainType: selectedChain.type,
    enabled: walletConnected && isEvmChain && filteredTokens.length > 0,
  });

  // Smart token auto-selection based on balances
  const [balanceAutoSelected, setBalanceAutoSelected] = useState(false);

  useEffect(() => {
    if (!walletConnected || balancesLoading || tokensWithBalances.length === 0) return;

    if (isEvmChain && !balanceAutoSelected) {
      const best = getAutoSelectedToken(tokensWithBalances);
      if (best) {
        setSelectedToken(best);
        setBalanceAutoSelected(true);
        return;
      }
    }

    // Fallback: select USDC/USDT or first token if nothing selected
    if (!selectedToken || !filteredTokens.find((t) => t.defuse_asset_id === selectedToken?.defuse_asset_id)) {
      const stable = filteredTokens.find(
        (t) => t.symbol === "USDC" || t.symbol === "USDT"
      );
      setSelectedToken(stable || filteredTokens[0] || null);
    }
  }, [walletConnected, balancesLoading, tokensWithBalances, isEvmChain, balanceAutoSelected, selectedToken, filteredTokens]);

  // Reset balance auto-selection when chain changes
  useEffect(() => {
    setBalanceAutoSelected(false);
  }, [selectedChain.id]);

  // Determine single-token mode (only one token with enough balance)
  const tokensWithEnough = tokensWithBalances.filter((t) => t.hasEnough);
  const singleTokenMode = isEvmChain && !balancesLoading && tokensWithEnough.length === 1;

  // Determine single-chain mode (only one chain has tokens)
  const singleChainMode = isEvmChain && chainBalancesLoaded && chainsWithBalance.length === 1;

  // Find the selected token in the enriched list (with balance data)
  const selectedTokenWithBalance = useMemo((): TokenWithBalance | null => {
    if (!selectedToken) return null;
    return tokensWithBalances.find(
      (t) => t.defuse_asset_id === selectedToken.defuse_asset_id
    ) || null;
  }, [selectedToken, tokensWithBalances]);

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

  // --- Auto-send hook (EVM only) ---
  const {
    sendPayment,
    status: autoSendStatus,
    reset: resetAutoSend,
  } = useAutoSend({
    paymentId,
    chainId: selectedChain.id,
    customerEmail: wantReceipt ? customerEmail : undefined, // P2-E
    customFields: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined, // HXF 3.4
    onSuccess: () => {
      setStep("processing");
    },
    onError: (error) => {
      setTxError(error);
      setTxSubmitting(false);
    },
  });

  // HXF 3.4: Check if all required custom fields are filled
  const customFieldsValid = customFields.every(
    (f) => !f.required || (customFieldValues[f.label] ?? "").trim().length > 0
  );

  // --- Pay action ---
  const handlePay = async () => {
    if (!selectedToken || !walletAddress || !destinationAssetId) return;
    if (!customFieldsValid) {
      setTxError("Please fill in all required fields");
      return;
    }
    setTxSubmitting(true);
    setTxError(null);
    resetAutoSend();

    try {
      // Get a live (non-dry) quote with deposit address
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

      // For EVM chains: auto-send transaction from wallet
      if (isEvmChain && liveQuote.amount_in) {
        await sendPayment(selectedToken, depAddr, liveQuote.amount_in);
        // On success, useAutoSend calls onSuccess which sets step to "processing"
        // On error, useAutoSend calls onError which sets txError
        setTxSubmitting(false);
      } else {
        // For non-EVM chains: show manual deposit flow
        setShowManualFlow(true);
        setTxSubmitting(false);
      }
    } catch {
      setTxError("Network error");
      setTxSubmitting(false);
    }
  };

  // --- Manual confirm (fallback for non-EVM or manual mode) ---
  const handleConfirmSent = async (txHash: string) => {
    if (!depositAddress || !walletAddress) return;
    setTxSubmitting(true);

    try {
      // P2-E: Include customer email if provided
      const completePayload: Record<string, unknown> = {
        sendTxHash: txHash || "pending",
        depositAddress,
        payerAddress: walletAddress,
        payerChain: selectedChain.id,
      };
      if (customerEmail && wantReceipt) {
        completePayload.customerEmail = customerEmail;
      }
      // HXF 3.4: Include custom field values
      if (Object.keys(customFieldValues).length > 0) {
        completePayload.customFields = customFieldValues;
      }

      const res = await fetch(`/api/checkout/${paymentId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completePayload),
      });

      if (res.ok) {
        setStep("processing");
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

  // --- Copy helper ---
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- USD equivalent helper ---
  const getUsdEquivalent = (amountRaw: string, token: Token | null): string => {
    if (!token?.price_usd || !amountRaw) return "";
    const dec = token.decimals || 6;
    const num = Number(amountRaw) / 10 ** dec;
    const usd = num * token.price_usd;
    if (usd < 0.01) return "";
    return `~$${usd.toFixed(2)}`;
  };

  // --- ProcessingStages callbacks ---
  const handleProcessingComplete = useCallback((status: "confirmed" | "failed") => {
    if (status === "confirmed") {
      setStep("success");
    } else {
      setStep("failed");
    }
  }, []);

  const handleStatusUpdate = useCallback((data: StatusData) => {
    setPayment((prev) => ({
      ...prev,
      status: data.status,
      sendTxHash: data.sendTxHash ?? prev.sendTxHash,
      fulfillmentTxHash: data.fulfillmentTxHash ?? prev.fulfillmentTxHash,
      confirmedAt: data.confirmedAt ?? prev.confirmedAt,
      customerChain: data.customerChain ?? prev.customerChain,
    }));
    if (data.failureReason) setFailureReason(data.failureReason);
  }, []);

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
        <div className="flex flex-col items-center text-center py-4">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 animate-in zoom-in duration-500">
            <Check className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-1">Payment Complete!</h2>
          <p className="text-sm text-zinc-400 mb-4">
            {formatCurrency(payment.amount, payment.currency)} delivered to merchant
          </p>
        </div>

        {/* P2-E: Payment receipt */}
        <PaymentReceipt payment={payment} merchant={merchant} />

        {payment.returnUrl && (
          <div className="mt-4 text-center">
            <a
              href={payment.returnUrl}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium hover:brightness-110 transition-all"
            >
              Return to merchant
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}
      </Card>
    );
  }

  // Failed / Refunded — improved UX with parsed failure reasons
  if (step === "failed") {
    const isRefunded = payment.status === "refunded";

    // Map failure reason to human-readable message
    const getFailureMessage = (reason: string | null): { message: string; refundEstimate: string } => {
      if (isRefunded) {
        return {
          message: "Don't worry — your funds have been returned to your wallet automatically.",
          refundEstimate: "The refund should appear in your wallet shortly.",
        };
      }
      const lower = (reason || "").toLowerCase();
      if (lower.includes("insufficient") && lower.includes("liquidity")) {
        return {
          message: "There wasn't enough liquidity on this route right now. Try a different token or try again in a few minutes.",
          refundEstimate: "Any sent funds will be refunded within ~5 minutes.",
        };
      }
      if (lower.includes("timeout") || lower.includes("expir")) {
        return {
          message: "The payment window expired before funds were detected. Your funds are safe and will be refunded automatically.",
          refundEstimate: "Estimated refund: ~5 minutes.",
        };
      }
      if (lower.includes("slippage")) {
        return {
          message: "Price moved too much during the swap. Your funds are being refunded to your wallet.",
          refundEstimate: "Estimated refund: ~2–5 minutes.",
        };
      }
      return {
        message: "Something unexpected happened, but your funds are safe. If you sent funds, they'll be refunded to your wallet.",
        refundEstimate: "Estimated refund: ~5 minutes.",
      };
    };

    const { message: failMsg, refundEstimate } = getFailureMessage(failureReason);

    const handleRetry = async () => {
      try {
        const res = await fetch(`/api/checkout/${paymentId}/retry`, { method: "POST" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.paymentUrl) {
          window.location.href = data.paymentUrl;
        }
      } catch {
        // Silently fail — user can try manually
      }
    };

    return (
      <Card merchant={merchant} isTest={isTest}>
        <div className="flex flex-col items-center text-center py-8">
          <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">
            {isRefunded ? "Payment Refunded" : "Payment Didn\u2019t Go Through"}
          </h2>
          <p className="text-sm text-zinc-300 mb-2 max-w-xs">
            {failMsg}
          </p>
          <p className="text-xs text-zinc-500 mb-6">
            {refundEstimate}
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            {!isRefunded && (
              <button
                onClick={handleRetry}
                className="w-full px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium hover:brightness-110 transition-all"
              >
                Try Again
              </button>
            )}
            {payment.returnUrl && (
              <a
                href={payment.returnUrl}
                className="w-full px-6 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-800 transition-colors text-center"
              >
                Return to merchant
              </a>
            )}
          </div>

          <a
            href="mailto:support@goblink.io"
            className="mt-4 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            Need help? Contact support
          </a>
        </div>
      </Card>
    );
  }

  // Processing — real-time stages
  if (step === "processing") {
    return (
      <Card merchant={merchant} isTest={isTest}>
        <JourneyStepper current="pay" />
        <AmountHeader payment={payment} />
        <ProcessingStages
          paymentId={paymentId}
          onComplete={handleProcessingComplete}
          onStatusUpdate={handleStatusUpdate}
          estimatedTimeSecs={quote?.estimated_time}
        />
      </Card>
    );
  }

  // --- Select step (main checkout form) ---

  // Non-EVM manual deposit flow (shown after clicking Pay on non-EVM chains)
  if (showManualFlow && depositAddress) {
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
                onClick={() => copyToClipboard(depositAddress)}
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
                  {selectedToken && (
                    <span className="text-zinc-500 ml-1 text-xs">
                      {getUsdEquivalent(quote.amount_in, selectedToken)}
                    </span>
                  )}
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

      {/* P2-E: Customer email input (optional receipt) */}
      <div className="mt-4">
        <CustomerEmailInput
          value={customerEmail}
          onChange={setCustomerEmail}
          wantReceipt={wantReceipt}
          onWantReceiptChange={setWantReceipt}
        />
      </div>

      {/* HXF 3.4: Custom checkout fields */}
      {customFields.length > 0 && (
        <div className="mt-4 space-y-3">
          {customFields.map((field) => (
            <div key={field.label} className="space-y-1.5">
              <label className="text-sm text-zinc-300">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  value={customFieldValues[field.label] ?? ""}
                  onChange={(e) =>
                    setCustomFieldValues((prev) => ({ ...prev, [field.label]: e.target.value }))
                  }
                  className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder={field.label}
                />
              ) : field.type === "select" ? (
                <select
                  value={customFieldValues[field.label] ?? ""}
                  onChange={(e) =>
                    setCustomFieldValues((prev) => ({ ...prev, [field.label]: e.target.value }))
                  }
                  className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === "email" ? "email" : "text"}
                  value={customFieldValues[field.label] ?? ""}
                  onChange={(e) =>
                    setCustomFieldValues((prev) => ({ ...prev, [field.label]: e.target.value }))
                  }
                  className="w-full rounded-lg bg-zinc-800/80 border border-zinc-700 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder={field.label}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-4">
        {/* Chain selector with balances */}
        <ChainSelector
          chains={SUPPORTED_CHAINS}
          selectedChain={selectedChain}
          onSelect={(chain) => {
            setSelectedChain(chain);
            setSelectedToken(null);
            setBalanceAutoSelected(false);
          }}
          chainBalances={chainBalances}
          singleChainMode={singleChainMode}
          isEvm={isEvmChain && walletConnected}
        />

        {/* Token selector with balances */}
        <TokenSelector
          tokens={tokensWithBalances.length > 0 ? tokensWithBalances : filteredTokens.map((t) => ({
            ...t,
            balance: "0",
            balanceRaw: BigInt(0),
            balanceUsd: 0,
            hasEnough: false,
          }))}
          selectedToken={selectedTokenWithBalance || (selectedToken ? {
            ...selectedToken,
            balance: "0",
            balanceRaw: BigInt(0),
            balanceUsd: 0,
            hasEnough: false,
          } : null)}
          onSelect={(token) => {
            setSelectedToken(token);
          }}
          loading={tokensLoading || balancesLoading}
          chainName={selectedChain.name}
          isEvm={isEvmChain && walletConnected}
          singleTokenMode={singleTokenMode}
        />

        {/* Quote display with USD equivalents */}
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
                  <span className="text-zinc-400">You send</span>
                  <span className="text-zinc-200 font-medium">
                    {quote.amount_in
                      ? (
                        <>
                          {formatTokenAmount(quote.amount_in, selectedToken.decimals)} {selectedToken.symbol}
                          {(() => {
                            const usd = getUsdEquivalent(quote.amount_in!, selectedToken);
                            return usd ? (
                              <span className="text-zinc-500 ml-1 text-xs">({usd})</span>
                            ) : null;
                          })()}
                        </>
                      )
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

        {/* Auto-send status */}
        {autoSendStatus === "sending" && (
          <div className="flex items-center justify-center gap-2 text-sm text-blue-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Confirm in your wallet...
          </div>
        )}

        {/* P2-E: QR code tab switcher (shown when deposit address available) */}
        {depositAddress && quote?.amount_in && selectedToken && (
          <>
            <QRTabSwitcher activeTab={paymentTab} onTabChange={setPaymentTab} />
            {paymentTab === "qr" && (
              <QRPayment
                depositAddress={depositAddress}
                amount={quote.amount_in}
                amountDisplay={`${formatTokenAmount(quote.amount_in, selectedToken.decimals)} ${selectedToken.symbol}`}
                fiatAmount={payment.amount}
                fiatCurrency={payment.currency}
                tokenSymbol={selectedToken.symbol}
                tokenAddress={selectedToken.address}
                tokenDecimals={selectedToken.decimals}
                isEvm={isEvmChain}
                expiresAt={payment.expiresAt}
              />
            )}
          </>
        )}

        {/* Action button */}
        {!walletConnected ? (
          <>
            {/* P2-E: Mobile wallet deep-links */}
            <MobileWalletConnect onFallbackConnect={() => connectWallet(selectedChain.type)} />

            <button
              onClick={() => connectWallet(selectedChain.type)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-medium hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </button>
          </>
        ) : (
          <button
            onClick={handlePay}
            disabled={!selectedToken || quoteLoading || !!quoteError || txSubmitting || isExpired || autoSendStatus === "sending" || !customFieldsValid}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-medium hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {txSubmitting || autoSendStatus === "sending" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Pay {formatCurrency(payment.amount, payment.currency)}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        )}

        {/* Manual fallback link for EVM users */}
        {walletConnected && isEvmChain && (
          <button
            onClick={() => {
              if (depositAddress) {
                setShowManualFlow(true);
              }
            }}
            className="w-full text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Having trouble? Copy address instead
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

      {/* Powered by goBlink footer (conditional) */}
      {(merchant?.showPoweredBadge !== false) && (
        <div className="mt-4 space-y-1">
          <a
            href="https://merchant.goblink.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" />
            </svg>
            Powered by{" "}
            <span className="font-semibold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              goBlink
            </span>
          </a>
          <p className="text-xs text-zinc-500 text-center">
            Non-custodial &middot; Instant settlement &middot; 26+ chains
          </p>
        </div>
      )}
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
            <span className="text-zinc-300 font-medium">2. Pay</span> — Approve
            the transaction in your wallet. Your tokens are automatically
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

function JourneyStepper({ current }: { current: "choose" | "pay" | "done" }) {
  const steps = [
    { id: "choose", label: "Choose" },
    { id: "pay", label: "Pay" },
    { id: "done", label: "Done" },
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
            {i < currentIdx ? `${s.label} ✓` : s.label}
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
  return `${chain}:mainnet:${token}`;
}

function toMinorUnits(amount: number, _currency: string): string {
  const decimals = 6;
  return Math.round(amount * 10 ** decimals).toString();
}

function formatTokenAmount(amountRaw: string, decimals?: number): string {
  const dec = decimals || 6;
  const num = Number(amountRaw) / 10 ** dec;
  if (num < 0.001) return "<0.001";
  return num.toFixed(Math.min(dec, 4));
}
