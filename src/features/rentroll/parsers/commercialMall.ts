import type { ParseResult } from "../types";
import type { PdfPageText } from "../pdf/extract";
import { extractAnchoredTable } from "../pdf/table";

export function parseCommercialMall(pages: PdfPageText[], pagesText: string[]): ParseResult {
  // This format has multi-line headers; we anchor on the most stable labels.
  const { columns, rows, warnings } = extractAnchoredTable(pages, {
    columns: [
      { key: "Tenant", headerMatchers: [/^Tenant$/i] },
      { key: "Unit/Lease", headerMatchers: [/^Unit,?\s*Lease$/i, /^Unit\s*Lease$/i] },
      { key: "Size", headerMatchers: [/^Size,?\s*Merch$/i, /^Size$/i] },
      { key: "Lease Dates", headerMatchers: [/^Lease$/i] },
      { key: "Unit Type", headerMatchers: [/^Unit Type$/i, /^Unit$/i] },
      { key: "Minimum Rent", headerMatchers: [/Minimum Rent/i] },
      { key: "CAM", headerMatchers: [/^CAM$/i] },
      { key: "FC CAM", headerMatchers: [/FC CAM/i] },
      { key: "RE", headerMatchers: [/^RE$/i] },
      { key: "Marketing & Other", headerMatchers: [/Marketing/i] },
      { key: "Gross Rent", headerMatchers: [/Gross Rent/i] },
    ],
    startAfterHeaderMatchers: [/Property Specific Rent Roll Report/i],
    stopIfLineIncludes: [/Report Date/i, /^Page\s*:\s*\d+/i],
    minFilledColumns: 3,
  });

  return {
    columns,
    rows,
    meta: {
      pages: pages.length,
      extractedAt: new Date().toISOString(),
      warnings: [
        ...warnings,
        "Commercial Mall parsing is template-based. If the PDF layout differs (or is scanned), parsing may need a custom mapping.",
      ],
    },
    raw: { pagesText },
  };
}
