import type { ParseResult } from "../types";
import type { PdfPageText } from "../pdf/extract";
import { extractAnchoredTable } from "../pdf/table";

export function parseMultifamily(pages: PdfPageText[], pagesText: string[]): ParseResult {
  const { columns, rows, warnings } = extractAnchoredTable(pages, {
    columns: [
      { key: "Unit", headerMatchers: [/^Unit$/i] },
      { key: "Tags", headerMatchers: [/^Tags$/i] },
      { key: "BD/BA", headerMatchers: [/^BD\/?\s*BA$/i, /^BD\/?BA$/i] },
      { key: "Tenant", headerMatchers: [/^Tenant$/i] },
      { key: "Status", headerMatchers: [/^Status$/i] },
      { key: "Sqft", headerMatchers: [/^Sqft$/i] },
      { key: "Market Rent", headerMatchers: [/^Market$/i, /^Market Rent$/i] },
      { key: "Rent", headerMatchers: [/^Rent$/i] },
      { key: "Deposit", headerMatchers: [/^Deposit$/i] },
      { key: "Lease From", headerMatchers: [/^Lease$/i, /^Lease From$/i] },
      { key: "Lease To", headerMatchers: [/^To$/i, /^Lease To$/i] },
      { key: "Move-in", headerMatchers: [/^Move-in$/i, /^Move\-in$/i] },
      { key: "Move-out", headerMatchers: [/^Move-out$/i, /^Move\-out$/i] },
      { key: "Past Due", headerMatchers: [/^Past Due$/i] },
      { key: "NSF Count", headerMatchers: [/^NSF$/i, /^NSF Count$/i] },
      { key: "Late Count", headerMatchers: [/^Late$/i, /^Late Count$/i] },
    ],
    startAfterHeaderMatchers: [/Rent Roll/i],
    stopIfLineIncludes: [/Created on/i, /^Page\s+\d+/i],
    minFilledColumns: 4,
  });

  return {
    columns,
    rows,
    meta: {
      pages: pages.length,
      extractedAt: new Date().toISOString(),
      warnings,
    },
    raw: { pagesText },
  };
}
