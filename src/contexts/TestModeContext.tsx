"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTestMode } from "@/hooks/use-test-mode";

interface TestModeContextValue {
  isTestMode: boolean;
  setTestMode: (value: boolean) => void;
  toggleTestMode: () => void;
}

const TestModeContext = createContext<TestModeContextValue>({
  isTestMode: false,
  setTestMode: () => {},
  toggleTestMode: () => {},
});

export function TestModeProvider({ children }: { children: ReactNode }) {
  const testMode = useTestMode();
  return (
    <TestModeContext.Provider value={testMode}>
      {children}
    </TestModeContext.Provider>
  );
}

export function useTestModeContext() {
  return useContext(TestModeContext);
}
