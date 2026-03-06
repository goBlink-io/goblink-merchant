"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SessionWarningModalProps {
  timeLeftSeconds: number;
  onExtend: () => void;
  onSignOut: () => void;
}

export function SessionWarningModal({
  timeLeftSeconds,
  onExtend,
  onSignOut,
}: SessionWarningModalProps) {
  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const display =
    minutes > 0
      ? `${minutes}:${seconds.toString().padStart(2, "0")}`
      : `${seconds}s`;

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-sm border-amber-500/30">
        <DialogHeader>
          <DialogTitle className="text-amber-400">
            Your session is about to expire
          </DialogTitle>
          <DialogDescription>
            You will be signed out in{" "}
            <span className="font-mono font-semibold text-amber-300">
              {display}
            </span>{" "}
            due to inactivity.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={onExtend}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white"
          >
            Stay Signed In
          </Button>
          <Button
            variant="ghost"
            onClick={onSignOut}
            className="w-full text-zinc-500 hover:text-zinc-300"
          >
            Sign Out Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
