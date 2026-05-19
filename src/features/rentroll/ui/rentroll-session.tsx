import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

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
  /** Promise that resolves to the usage row id created during the last extract. */
  getUsageId: () => Promise<number | null>;
};

const RentRollSessionContext = createContext<RentRollSessionState | null>(null);

export function RentRollSessionProvider({ children }: { children: React.ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<RentRollType>("commercial_retail");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const usageIdRef = useRef<Promise<number | null> | null>(null);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsProcessing(false);
    usageIdRef.current = null;
  }, []);

  const process = useCallback(async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setResult(null);
    usageIdRef.current = null;
    try {
      const { result: parsed, usageIdPromise } = await parseRentRoll(file, type);
      setResult(parsed);
      usageIdRef.current = usageIdPromise;
    } catch (e: any) {
      setError(e?.message ?? "Failed to process the PDF.");
    } finally {
      setIsProcessing(false);
    }
  }, [file, type]);

  const getUsageId = useCallback(async () => {
    return usageIdRef.current ? usageIdRef.current : Promise.resolve(null);
  }, []);

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
        usageIdRef.current = null;
      },
      setType: (t) => {
        setType(t);
        setResult(null);
        setError(null);
        usageIdRef.current = null;
      },
      process,
      reset,
      getUsageId,
    }),
    [file, type, isProcessing, result, error, process, reset, getUsageId],
  );

  return <RentRollSessionContext.Provider value={value}>{children}</RentRollSessionContext.Provider>;
}

export function useRentRollSession() {
  const ctx = useContext(RentRollSessionContext);
  if (!ctx) throw new Error("useRentRollSession must be used within RentRollSessionProvider");
  return ctx;
}
