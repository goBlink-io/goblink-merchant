"use client";

import { useState } from "react";
import { ChevronDown, Mail, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerEmailInputProps {
  value: string;
  onChange: (email: string) => void;
  wantReceipt: boolean;
  onWantReceiptChange: (want: boolean) => void;
}

export default function CustomerEmailInput({
  value,
  onChange,
  wantReceipt,
  onWantReceiptChange,
}: CustomerEmailInputProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-700/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5" />
          Get a receipt via email (optional)
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2.5 animate-in slide-in-from-top-1 duration-150">
          <input
            type="email"
            placeholder="your@email.com"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
          />

          {value && (
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                type="button"
                role="checkbox"
                aria-checked={wantReceipt}
                onClick={() => onWantReceiptChange(!wantReceipt)}
                className={cn(
                  "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                  wantReceipt
                    ? "bg-blue-600 border-blue-600"
                    : "bg-zinc-800 border-zinc-600"
                )}
              >
                {wantReceipt && <Check className="h-3 w-3 text-white" />}
              </button>
              <span className="text-xs text-zinc-400">
                Send me a receipt when payment confirms
              </span>
            </label>
          )}

          <p className="text-[10px] text-zinc-600 leading-snug">
            We only use this to send your receipt. We don&apos;t store it beyond that.
          </p>
        </div>
      )}
    </div>
  );
}
