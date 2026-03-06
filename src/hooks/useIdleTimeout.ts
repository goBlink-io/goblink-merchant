"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const IDLE_LIMIT = 60 * 60 * 1000; // 60 minutes
const WARN_AT = 55 * 60 * 1000; // 55 minutes (5 min warning)
const TICK_INTERVAL = 1000;

const EVENTS: (keyof DocumentEventMap)[] = [
  "mousemove",
  "keydown",
  "click",
  "scroll",
  "touchstart",
];

export function useIdleTimeout() {
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(300); // 5 min default
  const lastActivityRef = useRef(Date.now());
  const router = useRouter();

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login?reason=idle");
  }, [router]);

  const extendSession = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.refreshSession();
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    function handleActivity() {
      if (!showWarning) {
        lastActivityRef.current = Date.now();
      }
    }

    for (const event of EVENTS) {
      document.addEventListener(event, handleActivity, { passive: true });
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= IDLE_LIMIT) {
        clearInterval(interval);
        signOut();
        return;
      }

      if (elapsed >= WARN_AT) {
        setShowWarning(true);
        const remaining = Math.ceil((IDLE_LIMIT - elapsed) / 1000);
        setTimeLeftSeconds(Math.max(0, remaining));
      } else {
        setShowWarning(false);
      }
    }, TICK_INTERVAL);

    return () => {
      for (const event of EVENTS) {
        document.removeEventListener(event, handleActivity);
      }
      clearInterval(interval);
    };
  }, [showWarning, signOut]);

  return { showWarning, timeLeftSeconds, extendSession, signOut };
}
