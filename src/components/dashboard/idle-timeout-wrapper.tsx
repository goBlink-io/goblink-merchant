"use client";

import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { SessionWarningModal } from "@/components/dashboard/session-warning-modal";

export function IdleTimeoutWrapper() {
  const { showWarning, timeLeftSeconds, extendSession, signOut } =
    useIdleTimeout();

  if (!showWarning) return null;

  return (
    <SessionWarningModal
      timeLeftSeconds={timeLeftSeconds}
      onExtend={extendSession}
      onSignOut={signOut}
    />
  );
}
