"use client";

import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { SUPPORTED_CURRENCIES } from "@/lib/forex";
import { SharePaymentDialog } from "@/components/dashboard/share-payment-dialog";
import {
  Plus,
  Link2,
  Copy,
  Check,
  QrCode,
  Loader2,
} from "lucide-react";

interface PaymentLink {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_url: string | null;
  metadata: Record<string, unknown> | null;
  expires_at: string | null;
  created_at: string;
}

interface PaymentLinksContentProps {
  initialLinks: PaymentLink[];
  currency: string;
}

const statusFilters = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "paid", label: "Paid" },
];

export function PaymentLinksContent({
  initialLinks,
  currency,
}: PaymentLinksContentProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // Create form state
  const [amount, setAmount] = useState("");
  const [linkCurrency, setLinkCurrency] = useState(currency);
  const [memo, setMemo] = useState("");
  const [expiresInHours, setExpiresInHours] = useState("24");

  // Share dialog state
  const [shareLink, setShareLink] = useState<PaymentLink | null>(null);

  // Copy state
  const [createError, setCreateError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredLinks = initialLinks.filter((link) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") {
      return (
        link.status === "pending" &&
        (!link.expires_at || new Date(link.expires_at) > new Date())
      );
    }
    if (statusFilter === "expired") {
      return (
        link.status === "expired" ||
        (link.status === "pending" &&
          link.expires_at &&
          new Date(link.expires_at) <= new Date())
      );
    }
    if (statusFilter === "paid") {
      return link.status === "confirmed";
    }
    return true;
  });

  async function handleCreate() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;

    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/v1/internal/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          currency: linkCurrency,
          memo: memo || undefined,
          expiresInHours: Number(expiresInHours),
        }),
      });

      if (res.ok) {
        setCreateOpen(false);
        setAmount("");
        setMemo("");
        setExpiresInHours("24");
        setCreateError(null);
        router.refresh();
      } else {
        const body = await res.json().catch(() => null);
        setCreateError(body?.error ?? `Failed to create payment link (${res.status}).`);
      }
    } finally {
      setCreating(false);
    }
  }

  function handleCopy(url: string, id: string) {
    navigator.clipboard.writeText(url);
    haptic("tap");
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function getLinkStatus(link: PaymentLink): string {
    if (link.status === "confirmed") return "paid";
    if (
      link.status === "expired" ||
      (link.status === "pending" &&
        link.expires_at &&
        new Date(link.expires_at) <= new Date())
    ) {
      return "expired";
    }
    if (link.status === "pending" || link.status === "processing") return "active";
    return link.status;
  }

  function getLinkStatusColor(status: string): string {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "paid":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "expired":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return getStatusColor(status);
    }
  }

  return (
    <>
      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusFilters.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={() => setCreateOpen(true)}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create Payment Link
        </Button>
      </div>

      {/* Links list */}
      <Card>
        <CardContent className="p-0">
          {filteredLinks.length === 0 ? (
            <div className="text-center py-16">
              <Link2 className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-300">
                No payment links
              </h3>
              <p className="text-sm text-zinc-500 mt-1">
                {statusFilter !== "all"
                  ? "Try adjusting your filter."
                  : "Create your first payment link to get started."}
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                <div className="col-span-3">Amount</div>
                <div className="col-span-3">Memo</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Created</div>
                <div className="col-span-2"></div>
              </div>

              {/* Rows */}
              {filteredLinks.map((link) => {
                const displayStatus = getLinkStatus(link);
                return (
                  <div
                    key={link.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors items-center"
                  >
                    <div className="col-span-3">
                      <p className="text-sm font-medium text-white">
                        {formatCurrency(Number(link.amount), link.currency)}
                      </p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-sm text-zinc-400 truncate">
                        {(link.metadata?.memo as string) || "--"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <Badge
                        className={getLinkStatusColor(displayStatus)}
                        variant="outline"
                      >
                        {displayStatus}
                      </Badge>
                    </div>
                    <div className="col-span-2 hidden md:block">
                      <span className="text-sm text-zinc-400">
                        {formatDate(link.created_at)}
                      </span>
                    </div>
                    <div className="col-span-2 flex justify-end gap-1">
                      {link.payment_url && (
                        <>
                          <button
                            onClick={() => handleCopy(link.payment_url!, link.id)}
                            className="p-1.5 rounded-md text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
                            title="Copy link"
                          >
                            {copiedId === link.id ? (
                              <Check className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setShareLink(link)}
                            className="p-1.5 rounded-md text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
                            title="Show QR code"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Payment Link Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Payment Link</DialogTitle>
            <DialogDescription>
              Generate a shareable link for your customer to pay.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1.5 block">
                  Amount
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1.5 block">
                  Currency
                </label>
                <Select value={linkCurrency} onValueChange={setLinkCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
                      <SelectItem key={code} value={code}>
                        {info.symbol} {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-1.5 block">
                Memo (optional)
              </label>
              <Input
                placeholder="e.g., Invoice #1234"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-1.5 block">
                Expires in
              </label>
              <Select value={expiresInHours} onValueChange={setExpiresInHours}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="6">6 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="72">3 days</SelectItem>
                  <SelectItem value="168">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {createError && (
            <p className="text-sm text-red-400">{createError}</p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !amount || Number(amount) <= 0}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      {shareLink && shareLink.payment_url && (
        <SharePaymentDialog
          payment={{
            id: shareLink.id,
            amount: Number(shareLink.amount),
            currency: shareLink.currency,
            status: shareLink.status,
            payment_url: shareLink.payment_url,
            external_order_id: null,
          }}
          open={!!shareLink}
          onOpenChange={(open) => {
            if (!open) setShareLink(null);
          }}
        />
      )}
    </>
  );
}
