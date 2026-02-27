"use client";

import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { SharePaymentDialog } from "@/components/dashboard/share-payment-dialog";

interface PaymentShareSectionProps {
  payment: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    payment_url: string;
    external_order_id: string | null;
  };
}

export function PaymentShareSection({ payment }: PaymentShareSectionProps) {
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-xl bg-white p-4">
          <QRCodeCanvas
            value={payment.payment_url}
            size={180}
            level="M"
            marginSize={0}
            imageSettings={{
              src: "/goblink-logo.svg",
              height: 24,
              width: 24,
              excavate: true,
            }}
          />
        </div>
        <Button
          onClick={() => setShareOpen(true)}
          className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Share2 className="h-4 w-4" />
          Share Payment Link
        </Button>
      </div>

      <SharePaymentDialog
        payment={payment}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </>
  );
}
