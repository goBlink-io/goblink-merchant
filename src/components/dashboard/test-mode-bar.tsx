"use client";

import { useTestModeContext } from "@/contexts/TestModeContext";

export function TestModeBar() {
  const { isTestMode } = useTestModeContext();

  if (!isTestMode) return null;

  return (
    <div className="sticky top-0 z-30 w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-1.5 text-center">
      <p className="text-xs font-medium text-amber-400">
        TEST MODE — Viewing test data only
      </p>
    </div>
  );
}
