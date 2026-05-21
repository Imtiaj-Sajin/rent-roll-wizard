import type { ParseResult, RentRollType } from "./types";
import { authHeader } from "@/contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export interface ParseOutcome {
  result: ParseResult;
  usageIdPromise: Promise<number | null>;
}

export async function parseRentRoll(file: File, type: RentRollType): Promise<ParseOutcome> {
  const formData = new FormData();
  formData.append("file", file);

  const uploadedAt = new Date();
  const t0 = performance.now();
  const response = await fetch(`${API_BASE_URL}/extract/${type}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `Extraction failed: ${response.statusText}`);
  }

  const data = await response.json();
  const finishedAt = new Date();
  const processingMs = Math.round(performance.now() - t0);

  const result: ParseResult = {
    columns: data.columns,
    rows: data.rows,
    meta: {
      pages: data.meta?.pages ?? 0,
      extractedAt: finishedAt.toISOString(),
      warnings: data.meta?.warnings ?? [],
      debug: data.meta?.debug,
    },
  };

  const usageIdPromise = logUsage({
    filename: file.name,
    rent_roll_type: type,
    pages: result.meta?.pages ?? 0,
    rows_extracted: result.rows.length,
    columns_count: result.columns.length,
    tenants: result.rows.length,
    warnings_count: result.meta?.warnings?.length ?? 0,
    file_size_bytes: file.size,
    processing_ms: processingMs,
    uploaded_at: toDhakaNaive(uploadedAt),
    finished_at: toDhakaNaive(finishedAt),
  });

  return { result, usageIdPromise };
}

interface UsagePayload {
  filename: string;
  rent_roll_type: string;
  pages: number;
  rows_extracted: number;
  columns_count: number;
  tenants: number;
  warnings_count: number;
  file_size_bytes: number;
  processing_ms: number;
  uploaded_at: string;
  finished_at: string;
}

// Backend stores TIMESTAMP in Asia/Dhaka. Send a naive `YYYY-MM-DD HH:MM:SS`
// string in Dhaka local time so MySQL stores wall-clock time, matching `used_at`.
function toDhakaNaive(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(d).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

async function logUsage(payload: UsagePayload): Promise<number | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/usage`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export async function logDownload(usage: { usage_id?: number | null; filename?: string; rent_roll_type?: string }) {
  try {
    await fetch(`${API_BASE_URL}/usage/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({
        usage_id: usage.usage_id ?? null,
        filename: usage.filename ?? null,
        rent_roll_type: usage.rent_roll_type ?? null,
      }),
    });
  } catch {
    /* swallow — never block a download */
  }
}
