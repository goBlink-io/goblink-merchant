"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

export function WelcomeModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const show = searchParams.get("onboarded") === "true";

  if (!show) return null;

  function dismiss() {
    // Remove the query param from the URL
    const url = new URL(window.location.href);
    url.searchParams.delete("onboarded");
    router.replace(url.pathname + url.search);
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="sm:max-w-md relative overflow-hidden">
        <ConfettiBurst />
        <DialogHeader className="relative z-10">
          <DialogTitle className="text-xl text-center">
            Welcome to goBlink! {"\u{1F389}"}
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-400">
            You are ready to accept crypto payments from any chain.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="relative z-10 flex-col gap-2 sm:flex-col">
          <Button
            onClick={() => {
              dismiss();
              router.push("/dashboard/links");
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500"
          >
            Create your first payment link
          </Button>
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
