"use client";

import { useState, useRef, useCallback } from "react";
import { haptic } from "@/lib/haptics";
import { QRCodeCanvas } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import {
  Copy,
  Check,
  Download,
  Mail,
  Share2,
  Link2,
} from "lucide-react";

interface SharePayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_url: string;
  external_order_id: string | null;
}

interface SharePaymentDialogProps {
  payment: SharePayment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SharePaymentDialog({
  payment,
  open,
  onOpenChange,
}: SharePaymentDialogProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(payment.payment_url);
    haptic("tap");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [payment.payment_url]);

  const handleDownloadQR = useCallback(() => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;

    // Create a new canvas with white background padding
    const padding = 24;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width + padding * 2;
    exportCanvas.height = canvas.height + padding * 2;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(canvas, padding, padding);

    const link = document.createElement("a");
    link.download = `goblink-payment-${payment.id.slice(0, 8)}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  }, [payment.id]);

  const handleEmailShare = useCallback(() => {
    const subject = encodeURIComponent(
      `Payment Request — ${formatCurrency(payment.amount, payment.currency)}`
    );
    const body = encodeURIComponent(
      `You have a payment request for ${formatCurrency(payment.amount, payment.currency)}.\n\nPay here: ${payment.payment_url}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }, [payment.amount, payment.currency, payment.payment_url]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Payment — ${formatCurrency(payment.amount, payment.currency)}`,
          text: `Pay ${formatCurrency(payment.amount, payment.currency)}`,
          url: payment.payment_url,
        });
      } catch {
        // User cancelled or share failed — copy as fallback
        await handleCopyLink();
      }
    } else {
      await handleCopyLink();
    }
  }, [payment.amount, payment.currency, payment.payment_url, handleCopyLink]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Share Payment Link</span>
          </DialogTitle>
          <DialogDescription>
            Share this link with your customer to collect payment.
          </DialogDescription>
        </DialogHeader>

        {/* Payment summary */}
        <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
          <div>
            <p className="text-lg font-semibold text-white">
              {formatCurrency(payment.amount, payment.currency)}
            </p>
            {payment.external_order_id && (
              <p className="text-xs text-zinc-500">
                Order: {payment.external_order_id}
              </p>
            )}
          </div>
          <Badge className={getStatusColor(payment.status)} variant="outline">
            {payment.status}
          </Badge>
        </div>

        {/* QR Code */}
        <div className="flex justify-center py-2">
          <div
            ref={qrRef}
            className="rounded-xl bg-white p-4"
          >
            <QRCodeCanvas
              value={payment.payment_url}
              size={200}
              level="M"
              marginSize={0}
              imageSettings={{
                src: "/goblink-logo.svg",
                height: 28,
                width: 28,
                excavate: true,
              }}
            />
          </div>
        </div>

        {/* Payment URL */}
        <div className="flex gap-2">
          <Input
            readOnly
            value={payment.payment_url}
            className="font-mono text-xs"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopyLink}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="gap-2"
          >
            <Link2 className="h-4 w-4" />
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEmailShare}
            className="gap-2"
          >
            <Mail className="h-4 w-4" />
            Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNativeShare}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        {/* Download QR */}
        <Button
          variant="secondary"
          onClick={handleDownloadQR}
          className="w-full gap-2"
        >
          <Download className="h-4 w-4" />
          Download QR Code
        </Button>
      </DialogContent>
    </Dialog>
  );
}
