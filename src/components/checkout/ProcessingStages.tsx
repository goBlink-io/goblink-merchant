"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Check, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessingStagesProps {
  paymentId: string;
  /** The initial oneClickStatus from the parent, if available */
  initialStatus?: string;
  /** Called when payment reaches terminal state */
  onComplete: (status: "confirmed" | "failed") => void;
  /** Called with payment data on each poll */
  onStatusUpdate: (data: StatusData) => void;
  /** Estimated time in seconds from the quote response */
  estimatedTimeSecs?: number;
}

export interface StatusData {
  status: string;
  sendTxHash?: string;
  fulfillmentTxHash?: string;
  confirmedAt?: string;
  expiresAt?: string;
  customerChain?: string;
  oneClickStatus?: string;
  failureReason?: string;
}

interface Stage {
  id: string;
  label: string;
  description: string;
}

const STAGES: Stage[] = [
  { id: "sending", label: "Transaction sent", description: "Your wallet submitted the transaction" },
  { id: "confirmed_onchain", label: "Transaction confirmed", description: "Confirmed on the blockchain" },
  { id: "funds_received", label: "Funds received", description: "Exchange received your tokens" },
  { id: "swapping", label: "Swapping tokens", description: "Converting to merchant's token" },
  { id: "delivering", label: "Delivering to merchant", description: "Sending to merchant's wallet" },
  { id: "complete", label: "Complete!", description: "Payment delivered successfully" },
];

/**
 * Map 1Click execution statuses to our stage index.
 */
function getStageFromStatus(oneClickStatus?: string, paymentStatus?: string): number {
  if (paymentStatus === "confirmed") return 5; // Complete
  if (paymentStatus === "failed") return -1; // Failed

  switch (oneClickStatus) {
    case "PENDING_DEPOSIT":
      return 1; // Transaction confirmed but waiting for deposit
    case "KNOWN_DEPOSIT_TX":
      return 2; // Funds received
    case "PROCESSING":
      return 3; // Swapping
    case "SUCCESS":
      return 5; // Complete
    case "REFUNDED":
    case "FAILED":
      return -1; // Failed
    default:
      return 0; // Initial — just sent
  }
}

function getProgressPercent(stageIndex: number): number {
  const percentages = [10, 30, 50, 75, 90, 100];
  if (stageIndex < 0) return 0;
  return percentages[Math.min(stageIndex, 5)];
}

export default function ProcessingStages({
  paymentId,
  initialStatus,
  onComplete,
  onStatusUpdate,
  estimatedTimeSecs,
}: ProcessingStagesProps) {
  const [currentStage, setCurrentStage] = useState(() =>
    getStageFromStatus(initialStatus)
  );
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsedSecs, setElapsedSecs] = useState(0);

  // Elapsed time counter
  useEffect(() => {
    const iv = setInterval(() => setElapsedSecs((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  // Poll for status updates
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/checkout/${paymentId}/status`);
      if (!res.ok) return;
      const data: StatusData = await res.json();

      onStatusUpdate(data);

      const stage = getStageFromStatus(data.oneClickStatus, data.status);
      setCurrentStage((prev) => Math.max(prev, stage)); // Only advance, never go back

      if (data.status === "confirmed") {
        setCurrentStage(5);
        onComplete("confirmed");
        if (pollRef.current) clearInterval(pollRef.current);
      } else if (data.status === "failed" || data.status === "refunded" || data.status === "expired") {
        onComplete("failed");
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch {
      // Continue polling
    }
  }, [paymentId, onComplete, onStatusUpdate]);

  useEffect(() => {
    // Start polling immediately
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [poll]);

  const progress = getProgressPercent(currentStage);
  const estSecs = estimatedTimeSecs ?? 45;
  const isOverEstimate = elapsedSecs > estSecs * 2;

  const estimatedTimeText = currentStage >= 5
    ? "Done!"
    : isOverEstimate
      ? "Taking longer than usual. Your funds are safe."
      : elapsedSecs < 10
        ? `Estimated time: ~${estSecs} seconds`
        : elapsedSecs < 60
          ? `${elapsedSecs}s elapsed — almost there`
          : `${Math.floor(elapsedSecs / 60)}m ${elapsedSecs % 60}s elapsed`;

  // Smooth progress based on estimated time (fills 0→90% over the estimate)
  const timeProgress = currentStage >= 5
    ? 100
    : Math.min(90, (elapsedSecs / estSecs) * 90);
  // Use the higher of stage-based or time-based progress
  const displayProgress = Math.max(progress, timeProgress);

  return (
    <div className="flex flex-col items-center text-center py-6">
      {/* Animated icon */}
      <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
        {currentStage >= 5 ? (
          <Check className="h-8 w-8 text-emerald-400" />
        ) : (
          <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
        )}
      </div>

      <h2 className="text-lg font-semibold text-zinc-100 mb-1">
        {currentStage >= 5
          ? "Payment Complete!"
          : currentStage >= 3
            ? "Swapping tokens..."
            : currentStage >= 2
              ? "Funds received!"
              : "Processing Payment"}
      </h2>

      {/* Estimated time */}
      <div className={cn(
        "flex items-center gap-1.5 text-xs mb-5",
        isOverEstimate ? "text-amber-400" : "text-zinc-500"
      )}>
        <Clock className="h-3 w-3" />
        {estimatedTimeText}
      </div>

      {/* Progress bar — smooth fill over estimated duration */}
      <div className="w-full h-1.5 rounded-full bg-zinc-700 mb-6 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-linear",
            currentStage >= 5
              ? "bg-emerald-500"
              : "bg-blue-600"
          )}
          style={{ width: `${displayProgress}%` }}
        />
      </div>

      {/* Stage timeline */}
      <div className="w-full space-y-2.5">
        {STAGES.map((stage, i) => {
          const isDone = i < currentStage;
          const isActive = i === currentStage && currentStage < 5;
          const isPending = i > currentStage;

          return (
            <div key={stage.id} className="flex items-center gap-3">
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-500",
                  isDone && "bg-emerald-500/10",
                  isActive && "bg-blue-500/10",
                  isPending && "bg-zinc-800/50"
                )}
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : isActive ? (
                  <div className="relative">
                    <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                    <div className="absolute inset-0 h-2 w-2 rounded-full bg-blue-400 animate-ping opacity-75" />
                  </div>
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                )}
              </div>
              <div className="text-left">
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isDone && "text-emerald-400",
                    isActive && "text-blue-400",
                    isPending && "text-zinc-600"
                  )}
                >
                  {stage.label}
                </span>
                {isActive && (
                  <p className="text-[11px] text-zinc-500 mt-0.5 animate-in fade-in duration-300">
                    {stage.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
