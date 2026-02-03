import type { ParseResult } from "../types";
import type { PdfPageText } from "../pdf/extract";
import { extractWallBasedTable } from "../pdf/wallBasedTable";

export function parseCommercialRetail(pages: PdfPageText[], pagesText: string[]): ParseResult {
  // Use wall-based extraction algorithm (matches Python pdfplumber approach)
  const { columns, rows, warnings, debug } = extractWallBasedTable(pages, {
    headerAnchor: /Occupant/i,           // Find header row by this anchor
    headerPage: 3,                        // Page 3 has good structure (1-indexed)
    skipPatterns: [/^page/i, /database/i], // Filter out footer/metadata lines
    minFilledColumns: 3,
    yTolerance: 3,
  });

  return {
    columns,
    rows,
    meta: {
      pages: pages.length,
      extractedAt: new Date().toISOString(),
      warnings: [
        ...warnings,
        "Commercial Retail uses wall-based column extraction for accurate data separation.",
      ],
      // Include debug info for verification
      debug: debug ? {
        headerWords: debug.headerWords.map((h) => `${h.text} [${h.x.toFixed(1)}-${h.x1.toFixed(1)}]`),
        walls: debug.walls.map((w) => w.toFixed(1)),
        columnDefs: debug.columnDefs.map((c) => `${c.name}: ${c.xStart.toFixed(1)}-${c.xEnd.toFixed(1)}`),
      } : undefined,
    },
    raw: { pagesText },
  };
}
