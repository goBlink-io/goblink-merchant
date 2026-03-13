"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { haptic } from "@/lib/haptics";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "SGD", "HKD", "MXN"];

/** Escape HTML special chars to prevent XSS in generated snippets */
function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

interface ButtonGeneratorProps {
  merchantId: string;
}

export function ButtonGenerator({ merchantId }: ButtonGeneratorProps) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [label, setLabel] = useState("Pay with Crypto");
  const [style, setStyle] = useState<"primary" | "dark">("primary");
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedJs, setCopiedJs] = useState(false);

  const bg = style === "primary" ? "#2563eb" : "#27272a";
  const payUrl = `https://merchant.goblink.io/pay/new?merchant=${merchantId}&amount=${amount || "0"}&currency=${currency}`;

  const safeLabel = escapeHtml(label);
  const safeAmount = escapeHtml(amount || "0");
  const htmlSnippet = `<a href="${escapeHtml(payUrl)}" style="display:inline-block;padding:12px 24px;background:${bg};color:white;border-radius:8px;text-decoration:none;font-family:sans-serif;font-weight:600">${safeLabel}</a>`;

  const jsSnippet = `<script src="https://merchant.goblink.io/embed.js" data-merchant="${escapeHtml(merchantId)}" data-amount="${safeAmount}" data-currency="${escapeHtml(currency)}" data-label="${safeLabel}"${style === "dark" ? ' data-style="dark"' : ""}></script>`;

  async function copySnippet(text: string, setter: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
      haptic("tap");
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch { /* clipboard denied */ }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configure Button</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder="50.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Pay with Crypto"
            />
          </div>

          <div className="space-y-2">
            <Label>Style</Label>
            <Select value={style} onValueChange={(v) => setStyle(v as "primary" | "dark")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary (Blue)</SelectItem>
                <SelectItem value="dark">Dark (Zinc)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="rounded-lg border border-zinc-800 bg-white p-8 flex items-center justify-center">
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{
                  display: "inline-block",
                  padding: "12px 24px",
                  background: bg,
                  color: "white",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontFamily: "sans-serif",
                  fontWeight: 600,
                  fontSize: "14px",
                }}
              >
                {label || "Pay with Crypto"}
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Snippets */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">HTML Snippet</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copySnippet(htmlSnippet, setCopiedHtml)}
              className="gap-2"
            >
              {copiedHtml ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copiedHtml ? "Copied" : "Copy"}
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all">
              {htmlSnippet}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">JavaScript Embed</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copySnippet(jsSnippet, setCopiedJs)}
              className="gap-2"
            >
              {copiedJs ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copiedJs ? "Copied" : "Copy"}
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all">
              {jsSnippet}
            </pre>
            <p className="text-xs text-zinc-500 mt-3">
              Paste this snippet where you want the button to appear. The embed script creates a styled button automatically.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
