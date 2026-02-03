import type { DataRow } from "../types";
import type { PdfPageText, PdfTextItem } from "./extract";

type HeaderWord = {
  text: string;
  x: number;   // x0
  x1: number;  // end position
};

type ColumnDef = {
  name: string;
  xStart: number;
  xEnd: number;
};

type WallBasedOptions = {
  /** Regex or string to find the header row (e.g., /Occupant/i) */
  headerAnchor: RegExp | string;
  /** 1-indexed page number to analyze for headers (default: 3) */
  headerPage?: number;
  /** Patterns to skip (page footers, database lines, etc.) */
  skipPatterns?: (RegExp | string)[];
  /** Minimum filled columns for a row to be included */
  minFilledColumns?: number;
  /** Y-tolerance for grouping words into same row (default: 3) */
  yTolerance?: number;
};

type WallBasedResult = {
  columns: string[];
  rows: DataRow[];
  warnings: string[];
  debug?: {
    headerWords: HeaderWord[];
    walls: number[];
    columnDefs: ColumnDef[];
  };
};

/**
 * Find header row by anchor word and extract all header words on that Y-line
 */
function findHeaderWords(page: PdfPageText, anchor: RegExp | string, yTolerance: number): HeaderWord[] {
  const anchorMatch = typeof anchor === "string"
    ? page.items.find((it) => it.str.includes(anchor))
    : page.items.find((it) => anchor.test(it.str));

  if (!anchorMatch) return [];

  const headerY = anchorMatch.y;

  // Get all words on the same Y-line (within tolerance)
  const headerItems = page.items
    .filter((it) => Math.abs(it.y - headerY) < yTolerance)
    .sort((a, b) => a.x - b.x);

  return headerItems.map((it) => ({
    text: it.str,
    x: it.x,
    x1: it.x1,
  }));
}

/**
 * Calculate walls as midpoints between adjacent header ends and starts
 * wall = (header[i].x1 + header[i+1].x) / 2
 */
function calculateWalls(headerWords: HeaderWord[]): number[] {
  const walls: number[] = [];
  for (let i = 0; i < headerWords.length - 1; i++) {
    const wall = (headerWords[i].x1 + headerWords[i + 1].x) / 2;
    walls.push(wall);
  }
  return walls;
}

/**
 * Define column boundaries from walls:
 * - First column: 0 → walls[0]
 * - Middle columns: walls[i-1] → walls[i]
 * - Last column: walls[n-1] → pageWidth
 */
function getColumnDefs(headerWords: HeaderWord[], walls: number[], pageWidth: number): ColumnDef[] {
  return headerWords.map((hw, i) => ({
    name: hw.text,
    xStart: i === 0 ? 0 : walls[i - 1],
    xEnd: i === headerWords.length - 1 ? pageWidth : walls[i],
  }));
}

/**
 * Group words by Y-position into rows (like Python's defaultdict approach)
 */
function groupWordsByRow(items: PdfTextItem[], yTolerance: number): Map<number, PdfTextItem[]> {
  const rows = new Map<number, PdfTextItem[]>();

  for (const item of items) {
    const yKey = Math.round(item.y);

    // Find existing row key within tolerance
    let foundKey: number | null = null;
    for (const key of rows.keys()) {
      if (Math.abs(key - yKey) <= yTolerance) {
        foundKey = key;
        break;
      }
    }

    if (foundKey !== null) {
      rows.get(foundKey)!.push(item);
    } else {
      rows.set(yKey, [item]);
    }
  }

  return rows;
}

/**
 * Assign words to columns based on wall boundaries
 */
function assignWordsToColumns(words: PdfTextItem[], columnDefs: ColumnDef[]): string[] {
  const rowData: string[] = columnDefs.map(() => "");

  // Sort words left to right
  const sortedWords = [...words].sort((a, b) => a.x - b.x);

  for (const word of sortedWords) {
    const wordX = word.x;

    // Find which column this word belongs to
    for (let colIdx = 0; colIdx < columnDefs.length; colIdx++) {
      const col = columnDefs[colIdx];
      if (wordX >= col.xStart && wordX < col.xEnd) {
        // Add to column (handle multiple words per cell)
        if (rowData[colIdx]) {
          rowData[colIdx] += " " + word.str;
        } else {
          rowData[colIdx] = word.str;
        }
        break;
      }
    }
  }

  return rowData;
}

/**
 * Check if a line should be skipped based on patterns
 */
function shouldSkipLine(lineText: string, patterns: (RegExp | string)[]): boolean {
  const lower = lineText.toLowerCase().replace(/\s+/g, "");
  return patterns.some((p) => {
    if (typeof p === "string") {
      return lower.includes(p.toLowerCase());
    }
    return p.test(lineText) || p.test(lower);
  });
}

/**
 * Main wall-based table extraction - implements your Python algorithm exactly
 */
export function extractWallBasedTable(
  pages: PdfPageText[],
  options: WallBasedOptions
): WallBasedResult {
  const {
    headerAnchor,
    headerPage = 3,
    skipPatterns = [/^page/i, /database/i],
    minFilledColumns = 3,
    yTolerance = 3,
  } = options;

  const warnings: string[] = [];

  // Step 1: Find the analysis page (1-indexed to 0-indexed)
  const analysisPageIndex = headerPage - 1;
  const analysisPage = pages[analysisPageIndex] ?? pages[0];

  if (!analysisPage) {
    return {
      columns: [],
      rows: [],
      warnings: ["No pages found in PDF"],
    };
  }

  // Step 2: Find header words
  const headerWords = findHeaderWords(analysisPage, headerAnchor, yTolerance);

  if (headerWords.length === 0) {
    warnings.push(`Header anchor "${headerAnchor}" not found on page ${headerPage}`);
    return {
      columns: [],
      rows: [],
      warnings,
    };
  }

  // Step 3: Calculate walls
  const walls = calculateWalls(headerWords);

  // Step 4: Define column boundaries
  const pageWidth = analysisPage.width || 800;
  const columnDefs = getColumnDefs(headerWords, walls, pageWidth);

  // Get header Y position for filtering data rows
  const headerY = headerWords[0].x !== undefined
    ? pages[analysisPageIndex]?.items.find((it) => it.str === headerWords[0].text)?.y ?? 0
    : 0;

  // Step 5: Extract data from all pages
  const allRows: DataRow[] = [];
  const columnNames = columnDefs.map((c) => c.name);

  for (const page of pages) {
    // Get words below header (using a buffer of 5 like Python)
    const dataItems = page.items.filter((it) => it.y < headerY - 5 || page.pageNumber !== analysisPageIndex + 1);

    // Group words by Y-position (rows)
    const rowGroups = groupWordsByRow(
      page.pageNumber === analysisPageIndex + 1
        ? page.items.filter((it) => it.y < headerY - 5)
        : page.items,
      yTolerance
    );

    // Process each row (sorted by Y descending - top to bottom in PDF coords)
    const sortedYs = Array.from(rowGroups.keys()).sort((a, b) => b - a);

    for (const y of sortedYs) {
      const rowWords = rowGroups.get(y)!;
      const lineText = rowWords.map((w) => w.str).join(" ");

      // Skip filter patterns
      if (shouldSkipLine(lineText, skipPatterns)) {
        continue;
      }

      // Skip header row itself
      if (headerWords.some((hw) => lineText.includes(hw.text) && headerWords.length > 5)) {
        continue;
      }

      // Assign words to columns
      const rowData = assignWordsToColumns(rowWords, columnDefs);

      // Check minimum filled columns
      const filled = rowData.filter((v) => v.trim().length > 0).length;
      if (filled < minFilledColumns) {
        continue;
      }

      // Convert to DataRow object
      const dataRow: DataRow = {};
      columnNames.forEach((name, idx) => {
        dataRow[name] = rowData[idx] || "";
      });

      allRows.push(dataRow);
    }
  }

  return {
    columns: columnNames,
    rows: allRows,
    warnings,
    debug: {
      headerWords,
      walls,
      columnDefs,
    },
  };
}
