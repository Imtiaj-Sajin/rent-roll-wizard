import type { ParseResult, RentRollType } from "./types";

// Backend API URL - update this to your VPS URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function parseRentRoll(file: File, type: RentRollType): Promise<ParseResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/extract/${type}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `Extraction failed: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    columns: data.columns,
    rows: data.rows,
    meta: {
      pages: data.meta?.pages ?? 0,
      extractedAt: new Date().toISOString(),
      warnings: [],
      debug: data.meta?.debug,
    },
  };
}
