"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  QrCode,
  Loader2,
  X,
  Check,
  Printer,
  RotateCcw,
} from "lucide-react";

interface POSContentProps {
  currency: string;
}

type POSState = "input" | "generating" | "waiting" | "success";

export function POSContent({ currency }: POSContentProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState<POSState>("input");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  async function handleGenerate() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;

    setState("generating");
    try {
      const res = await fetch("/api/v1/internal/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          currency,
          memo: description || `POS Sale`,
          expiresInHours: 1,
        }),
      });

      if (!res.ok) {
        setState("input");
        return;
      }

      const data = await res.json();
      setPaymentUrl(data.payment_url);
      setPaymentId(data.id);
      setState("waiting");

      // Start polling
      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/checkout/${data.id}/status`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (
              statusData.status === "confirmed" ||
              statusData.status === "processing"
            ) {
              cleanup();
              setState("success");
              playSuccessSound();
              successTimerRef.current = setTimeout(() => {
                handleReset();
              }, 5000);
            }
          }
        } catch {
          // Polling error — ignore
        }
      }, 3000);
    } catch {
      setState("input");
    }
  }

  function handleReset() {
    cleanup();
    setState("input");
    setAmount("");
    setDescription("");
    setPaymentUrl("");
    setPaymentId("");
  }

  function handleCancel() {
    cleanup();
    setState("input");
    setPaymentUrl("");
    setPaymentId("");
  }

  function handlePrint() {
    window.print();
  }

  function handleKeypadPress(digit: string) {
    if (digit === "C") {
      setAmount("");
      return;
    }
    if (digit === "." && amount.includes(".")) return;
    // Limit to 2 decimal places
    const parts = amount.split(".");
    if (parts[1] && parts[1].length >= 2) return;
    setAmount((prev) => prev + digit);
  }

  // Input view
  if (state === "input") {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Amount display */}
            <div className="text-center py-4">
              <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                Amount ({currency})
              </p>
              <p className="text-5xl font-bold text-white tabular-nums">
                {amount ? formatCurrency(Number(amount), currency) : "$0.00"}
              </p>
            </div>

            {/* Numeric keypad */}
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "C"].map(
                (key) => (
                  <Button
                    key={key}
                    variant={key === "C" ? "destructive" : "outline"}
                    className="h-14 text-xl font-semibold"
                    onClick={() => handleKeypadPress(key)}
                  >
                    {key}
                  </Button>
                )
              )}
            </div>

            {/* Description */}
            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {/* Generate button */}
            <Button
              className="w-full h-14 text-lg gap-3 bg-blue-600 hover:bg-blue-700"
              onClick={handleGenerate}
              disabled={!amount || Number(amount) <= 0}
            >
              <QrCode className="h-5 w-5" />
              Generate QR Code
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generating view
  if (state === "generating") {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
          <p className="text-zinc-400">Generating payment...</p>
        </div>
      </div>
    );
  }

  // Success view
  if (state === "success") {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-6">
          <div className="mx-auto w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center animate-in zoom-in duration-300">
            <Check className="h-12 w-12 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-emerald-400">
              Payment Received!
            </h2>
            <p className="text-xl text-white mt-2">
              {formatCurrency(Number(amount), currency)}
            </p>
            {description && (
              <p className="text-zinc-400 mt-1">{description}</p>
            )}
          </div>
          <p className="text-sm text-zinc-500">
            Resetting in a few seconds...
          </p>
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            New Sale
          </Button>
        </div>
      </div>
    );
  }

  // Waiting for payment view (QR display)
  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Print-friendly receipt area */}
      <Card className="print:border-0 print:shadow-none">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Amount */}
            <div>
              <p className="text-sm text-zinc-500 print:text-gray-500 uppercase tracking-wider">
                Amount Due
              </p>
              <p className="text-4xl font-bold text-white print:text-black mt-1">
                {formatCurrency(Number(amount), currency)}
              </p>
              {description && (
                <p className="text-sm text-zinc-400 print:text-gray-600 mt-2">
                  {description}
                </p>
              )}
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div
                ref={qrRef}
                className="rounded-2xl bg-white p-6 inline-block"
              >
                <QRCodeCanvas
                  value={paymentUrl}
                  size={280}
                  level="M"
                  marginSize={0}
                  imageSettings={{
                    src: "/goblink-logo.svg",
                    height: 36,
                    width: 36,
                    excavate: true,
                  }}
                />
              </div>
            </div>

            {/* Waiting indicator - hidden on print */}
            <div className="print:hidden">
              <div className="flex items-center justify-center gap-2 text-blue-400">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                <span className="text-sm font-medium">
                  Waiting for payment...
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions - hidden on print */}
      <div className="flex gap-3 print:hidden">
        <Button
          variant="outline"
          onClick={handleCancel}
          className="flex-1 gap-2"
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={handlePrint}
          className="flex-1 gap-2"
        >
          <Printer className="h-4 w-4" />
          Print Receipt
        </Button>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          nav,
          aside,
          header,
          .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

function playSuccessSound() {
  try {
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Play two-tone success beep
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.4);
  } catch {
    // Audio not available — silently ignore
  }
}
