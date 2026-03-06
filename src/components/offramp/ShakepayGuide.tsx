"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Save,
} from "lucide-react";

interface ShakepayGuideProps {
  savedAddress?: string;
  onSaveAddress?: (address: string) => void;
  saving?: boolean;
}

const STEPS = [
  "Open the Shakepay app on your phone.",
  'Go to your Crypto wallets → USDC → tap "Receive".',
  "Copy your USDC deposit address (ERC-20 / Ethereum only).",
  "Send USDC from your goBlink settlement wallet to that address.",
  "Once received in Shakepay, withdraw CAD via Interac e-Transfer to your bank.",
];

export function ShakepayGuide({
  savedAddress,
  onSaveAddress,
  saving,
}: ShakepayGuideProps) {
  const [address, setAddress] = useState(savedAddress || "");
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!savedAddress) return;
    navigator.clipboard.writeText(savedAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      {/* Warning */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-300">
          Shakepay only accepts USDC on the <strong>Ethereum network</strong>.
          Do not send USDC on Base, Polygon, or any other network — funds will
          be lost.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          How it works
        </p>
        <ol className="space-y-2">
          {STEPS.map((step, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-sm text-zinc-300"
            >
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-zinc-800 text-xs font-bold text-blue-400 shrink-0">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Optional: save deposit address */}
      {onSaveAddress && (
        <div className="space-y-3 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
          <Label className="text-sm text-zinc-300">
            Save your Shakepay USDC deposit address (optional)
          </Label>
          <div className="flex gap-2">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value.trim())}
              placeholder="0x... (Ethereum ERC-20 address)"
              className="flex-1"
            />
            {savedAddress && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                title="Copy address"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => onSaveAddress(address)}
            disabled={saving || !address}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Address
              </>
            )}
          </Button>
        </div>
      )}

      {/* Shakepay link */}
      <a
        href="https://shakepay.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        Don&apos;t have Shakepay? Sign up here
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
