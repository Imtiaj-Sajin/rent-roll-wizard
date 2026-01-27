import type { DataRow } from "../types";
import type { PdfPageText, PdfTextItem } from "./extract";

type ColumnSpec = {
  key: string;
  // any of these phrases can anchor the column header
  headerMatchers: (string | RegExp)[];
};

type AnchoredColumn = { key: string; x: number };

function matches(str: string, m: string | RegExp) {
  if (typeof m === "string") return str.toLowerCase() === m.toLowerCase();
  return m.test(str);
}

function findAnchors(page: PdfPageText, columns: ColumnSpec[]): AnchoredColumn[] {
  const anchors: AnchoredColumn[] = [];
  for (const col of columns) {
    const matchItem = page.items.find((it) => col.headerMatchers.some((m) => matches(it.str, m)));
    if (matchItem) anchors.push({ key: col.key, x: matchItem.x });
  }
  return anchors.sort((a, b) => a.x - b.x);
}

function groupLines(items: PdfTextItem[]) {
  const bucketSize = 2.5;
  const byLine = new Map<number, PdfTextItem[]>();
  for (const it of items) {
    const key = Math.round(it.y / bucketSize) * bucketSize;
    const arr = byLine.get(key) ?? [];
    arr.push(it);
    byLine.set(key, arr);
  }
  return Array.from(byLine.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, arr]) => arr.sort((a, b) => a.x - b.x));
}

function assignToColumns(tokens: PdfTextItem[], anchors: AnchoredColumn[], padding = 6) {
  const cols = anchors;
  const result: Record<string, string[]> = Object.fromEntries(cols.map((c) => [c.key, []]));

  for (const tok of tokens) {
    // find rightmost anchor whose x <= tok.x + padding
    let chosen = cols[0]?.key;
    for (const c of cols) {
      if (tok.x + padding >= c.x) chosen = c.key;
      else break;
    }
    if (!chosen) continue;
    result[chosen].push(tok.str);
  }
  return result;
}

function rowFromAssigned(assigned: Record<string, string[]>) {
  const row: DataRow = {};
  for (const [k, v] of Object.entries(assigned)) row[k] = v.join(" ").trim();
  return row;
}

export function extractAnchoredTable(pages: PdfPageText[], options: {
  columns: ColumnSpec[];
  headerPage?: number;
  startAfterHeaderMatchers?: (string | RegExp)[];
  stopIfLineIncludes?: (string | RegExp)[];
  minFilledColumns?: number;
}): { columns: string[]; rows: DataRow[]; warnings: string[] } {
  const headerPage = options.headerPage ?? 1;
  const header = pages.find((p) => p.pageNumber === headerPage) ?? pages[0];
  const warnings: string[] = [];

  const anchors = findAnchors(header, options.columns);
  if (anchors.length < Math.max(3, Math.floor(options.columns.length / 2))) {
    warnings.push(
      "Could not confidently detect all columns in the PDF header. Ensure the PDF contains selectable text (not a scanned image).",
    );
  }

  const rows: DataRow[] = [];
  const minFilled = options.minFilledColumns ?? Math.max(2, Math.floor(anchors.length * 0.4));

  for (const page of pages) {
    const lines = groupLines(page.items);

    let started = !options.startAfterHeaderMatchers?.length;
    for (const tokens of lines) {
      const lineText = tokens.map((t) => t.str).join(" ");

      if (!started && options.startAfterHeaderMatchers) {
        if (options.startAfterHeaderMatchers.some((m) => (typeof m === "string" ? lineText.includes(m) : m.test(lineText)))) {
          started = true;
        }
        continue;
      }

      if (options.stopIfLineIncludes?.some((m) => (typeof m === "string" ? lineText.includes(m) : m.test(lineText)))) {
        continue;
      }

      // Ignore obvious header lines
      if (options.columns.some((c) => c.headerMatchers.some((m) => (typeof m === "string" ? lineText === m : m.test(lineText))))) {
        continue;
      }

      const assigned = assignToColumns(tokens, anchors);
      const row = rowFromAssigned(assigned);
      const filled = Object.values(row).filter((v) => String(v ?? "").trim().length > 0).length;
      if (filled >= minFilled) rows.push(row);
    }
  }

  return { columns: anchors.map((a) => a.key), rows, warnings };
}
