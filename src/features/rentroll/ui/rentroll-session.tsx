import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { ParseResult, RentRollType } from "@/features/rentroll/types";
import { parseRentRoll } from "@/features/rentroll/parse";

type RentRollSessionState = {
  file: File | null;
  type: RentRollType;
  isProcessing: boolean;
  result: ParseResult | null;
  error: string | null;
  setFile: (file: File | null) => void;
  setType: (type: RentRollType) => void;
  process: () => Promise<void>;
  reset: () => void;
};

const RentRollSessionContext = createContext<RentRollSessionState | null>(null);

export function RentRollSessionProvider({ children }: { children: React.ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<RentRollType>("multifamily");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsProcessing(false);
  }, []);

  const process = useCallback(async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setResult(null);
    try {
      const parsed = await parseRentRoll(file, type);
      setResult(parsed);
    } catch (e: any) {
      setError(e?.message ?? "Failed to process the PDF.");
    } finally {
      setIsProcessing(false);
    }
  }, [file, type]);

  const value = useMemo<RentRollSessionState>(
    () => ({
      file,
      type,
      isProcessing,
      result,
      error,
      setFile: (f) => {
        setFile(f);
        setResult(null);
        setError(null);
      },
      setType: (t) => {
        setType(t);
        setResult(null);
        setError(null);
      },
      process,
      reset,
    }),
    [file, type, isProcessing, result, error, process, reset],
  );

  return <RentRollSessionContext.Provider value={value}>{children}</RentRollSessionContext.Provider>;
}

export function useRentRollSession() {
  const ctx = useContext(RentRollSessionContext);
  if (!ctx) throw new Error("useRentRollSession must be used within RentRollSessionProvider");
  return ctx;
}
