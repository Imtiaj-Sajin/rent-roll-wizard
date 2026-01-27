import type { ParseResult } from "../types";
import type { PdfPageText } from "../pdf/extract";
import { extractAnchoredTable } from "../pdf/table";

export function parseCommercialRetail(pages: PdfPageText[], pagesText: string[]): ParseResult {
  const { columns, rows, warnings } = extractAnchoredTable(pages, {
    columns: [
      { key: "Bldg Id", headerMatchers: [/^Bldg Id$/i] },
      { key: "Suit Id", headerMatchers: [/^Suit Id$/i, /^Suit$/i] },
      { key: "Occupant Name", headerMatchers: [/^Occupant Name$/i] },
      { key: "Rent Start", headerMatchers: [/^Rent Start$/i] },
      { key: "Expiration", headerMatchers: [/^Expiration$/i] },
      { key: "GLA Sqft", headerMatchers: [/^GLA$/i, /^GLA\s*Sqft$/i] },
      { key: "Monthly Base Rent", headerMatchers: [/Monthly\s*Base\s*Rent/i] },
      { key: "Annual Rate PSF", headerMatchers: [/Annual\s*Rate\s*PSF/i] },
      { key: "Monthly Cost Recovery", headerMatchers: [/Monthly\s*Cost\s*Recovery/i] },
      { key: "Monthly Expense Stop", headerMatchers: [/Expense\s*Stop/i] },
      { key: "Monthly Other Income", headerMatchers: [/Other\s*Income/i] },
      { key: "Future Cat", headerMatchers: [/Future\s*Rent\s*Increases/i, /^Cat$/i] },
      { key: "Future Date", headerMatchers: [/^Date$/i] },
      { key: "Future Monthly Amount", headerMatchers: [/Monthly\s*Amount/i] },
      { key: "Future PSF", headerMatchers: [/^PSF$/i] },
    ],
    startAfterHeaderMatchers: [/Rent Roll/i],
    stopIfLineIncludes: [/Database:/i, /^Page\s*:\s*\d+/i],
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
        "Commercial Retail files often contain multi-line 'Future Rent Increases'. Those may require a second pass to normalize into separate rows.",
      ],
    },
    raw: { pagesText },
  };
}
