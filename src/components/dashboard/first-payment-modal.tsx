"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FirstPaymentModalProps {
  notificationId: string;
  paymentLink: string;
}

const CONFETTI_COLORS = [
  "#2563EB", "#7C3AED", "#F59E0B", "#10B981", "#EF4444",
  "#EC4899", "#06B6D4", "#F97316",
];

function ConfettiBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => {
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const left = `${Math.random() * 100}%`;
        const delay = `${Math.random() * 0.5}s`;
        const size = 4 + Math.random() * 6;
        const angle = Math.random() * 360;
        const distance = 80 + Math.random() * 200;
        const dx = Math.cos((angle * Math.PI) / 180) * distance;
        const dy = Math.sin((angle * Math.PI) / 180) * distance - 100;

        return (
          <div
            key={i}
            className="absolute rounded-sm animate-confetti-burst"
            style={{
              left,
              top: "50%",
              width: `${size}px`,
              height: `${size * 0.6}px`,
              backgroundColor: color,
              animationDelay: delay,
              // @ts-expect-error CSS custom properties for animation
              "--dx": `${dx}px`,
              "--dy": `${dy}px`,
              "--rot": `${Math.random() * 720 - 360}deg`,
            }}
          />
        );
      })}
      <style jsx>{`
        @keyframes confetti-burst {
          0% {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(0.5);
          }
        }
        .animate-confetti-burst {
          animation: confetti-burst 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
      `}</style>
    </div>
  );
}

export function FirstPaymentModal({ notificationId, paymentLink }: FirstPaymentModalProps) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) setOpen(false);
  }, [dismissed]);

  async function dismiss() {
    await fetch(`/api/v1/internal/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
    setDismissed(true);
  }

  const shareUrl =
    "https://twitter.com/intent/tweet?text=I+just+accepted+my+first+crypto+payment+via+%40goblink!+No+banks%2C+no+delays.+%E2%9A%A1";

  if (dismissed) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="sm:max-w-md relative overflow-hidden">
        <ConfettiBurst />
        <DialogHeader className="relative z-10">
          <DialogTitle className="text-xl text-center">
            Your first payment landed! {"\u{1F389}"}
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-400">
            You just accepted your first crypto payment.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="relative z-10 flex-col gap-2 sm:flex-col">
          <Button
            onClick={() => {
              dismiss();
              router.push(paymentLink);
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500"
          >
            View Payment
          </Button>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            Share on X
          </a>
          <Button
            variant="ghost"
            onClick={dismiss}
            className="w-full text-zinc-500 hover:text-zinc-300"
          >
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
