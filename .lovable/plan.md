
# Plan: Implement Wall-Based PDF Extraction for Commercial Retail

## Overview

Replace the current predefined-matcher approach with your dynamic **wall-based column boundary** algorithm for Commercial Retail. The good news: **pdf.js (already installed) provides the same word-level coordinate data** (`x0`, `x1`, `y`) as `pdfplumber` — so we can implement your algorithm entirely in JavaScript without needing a Python backend.

---

## Architecture Comparison

```text
CURRENT APPROACH (Predefined)          YOUR APPROACH (Wall-Based)
┌────────────────────────────┐         ┌────────────────────────────┐
│  Regex matchers for each   │         │  Find header row by anchor │
│  column header             │         │  (e.g. "Occupant")         │
│                            │         │                            │
│  Use header x as left edge │         │  Calculate WALLS between   │
│                            │         │  headers (midpoint of gap) │
│  Assign words if x >= col  │         │                            │
│                            │         │  Column = wall-to-wall     │
└────────────────────────────┘         └────────────────────────────┘
        ↓ Less accurate                        ↓ More accurate
```

---

## Implementation Steps

### Step 1: Extend PDF Extraction to Include `x1` (Word End Position)

**File:** `src/features/rentroll/pdf/extract.ts`

Currently, we extract `x`, `y`, `w` (width) for each text item. We'll add `x1` (end position) explicitly for clarity:

```typescript
export type PdfTextItem = {
  str: string;
  x: number;    // x0 (start)
  x1: number;   // end position (x + width)
  y: number;
  w: number;
};
```

---

### Step 2: Create Wall-Based Table Extractor

**New File:** `src/features/rentroll/pdf/wallBasedTable.ts`

This implements your exact algorithm:

1. **Find Header Row** - Locate the row containing an anchor word (e.g., "Occupant", "OccupantName")
2. **Extract Header Words** - Get all words on that y-line, sorted by `x`
3. **Calculate Walls** - For each pair of adjacent headers: `wall = (header[i].x1 + header[i+1].x) / 2`
4. **Define Column Boundaries**:
   - First column: `0` → `walls[0]`
   - Middle columns: `walls[i-1]` → `walls[i]`
   - Last column: `walls[n-1]` → `pageWidth`
5. **Extract Rows** - For each y-line below headers, assign words to columns based on their `x` position
6. **Filter Rows** - Skip unwanted lines (page footers, database markers, etc.)

---

### Step 3: Update Commercial Retail Parser

**File:** `src/features/rentroll/parsers/commercialRetail.ts`

Replace the predefined-matcher approach with the wall-based extractor:

```typescript
import { extractWallBasedTable } from "../pdf/wallBasedTable";

export function parseCommercialRetail(pages, pagesText) {
  const { columns, rows, warnings } = extractWallBasedTable(pages, {
    headerAnchor: /Occupant/i,           // Find header row
    headerPage: 3,                        // Page 3 has good structure (0-indexed: 2)
    skipPatterns: [/^page/i, /database/i], // Filter these out
    minFilledColumns: 3,
  });
  
  return { columns, rows, meta: {...}, raw: {...} };
}
```

---

### Step 4: Add Debug/Analysis Mode (Optional but Useful)

Add a debug output in the Extract page showing:
- Detected header words with positions
- Calculated walls
- Column definitions

This matches your Python `print` statements for verification.

---

## Technical Details

### Wall Calculation Logic (Matching Your Python)

```typescript
function calculateWalls(headerWords: HeaderWord[]): number[] {
  const walls: number[] = [];
  for (let i = 0; i < headerWords.length - 1; i++) {
    // Wall = midpoint between current header end and next header start
    const wall = (headerWords[i].x1 + headerWords[i + 1].x) / 2;
    walls.push(wall);
  }
  return walls;
}

function getColumnBoundaries(headerWords: HeaderWord[], walls: number[], pageWidth: number) {
  return headerWords.map((hw, i) => ({
    name: hw.text,
    xStart: i === 0 ? 0 : walls[i - 1],
    xEnd: i === headerWords.length - 1 ? pageWidth : walls[i],
  }));
}
```

### Row Grouping (Matching Your Python)

```typescript
// Group words by Y-position (rows) - same as your defaultdict approach
function groupWordsByRow(words: PdfTextItem[], yTolerance = 3): Map<number, PdfTextItem[]> {
  const rows = new Map<number, PdfTextItem[]>();
  for (const word of words) {
    const yKey = Math.round(word.y);
    // Find existing row within tolerance or create new
    // ... (implementation details)
  }
  return rows;
}
```

---

## Why No Backend Needed

| Feature | pdfplumber (Python) | pdf.js (JavaScript) |
|---------|---------------------|---------------------|
| Word text | `word['text']` | `item.str` |
| Word start X | `word['x0']` | `item.transform[4]` |
| Word end X | `word['x1']` | `transform[4] + item.width` |
| Word Y | `word['top']` | `item.transform[5]` |
| Page width | `page.width` | `page.getViewport().width` |

pdf.js provides **all the same data** as pdfplumber, so your algorithm translates directly to JavaScript.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/features/rentroll/pdf/extract.ts` | Add `x1` to `PdfTextItem`, add page width extraction |
| `src/features/rentroll/pdf/wallBasedTable.ts` | **NEW** - Wall-based extraction algorithm |
| `src/features/rentroll/parsers/commercialRetail.ts` | Use wall-based extractor instead of anchored table |
| `src/features/rentroll/types.ts` | Add debug info type (optional) |

---

## What About Multifamily and Commercial Mall?

As you mentioned, those aren't solved yet. The current predefined-matcher approach will remain for them until you provide working extraction logic. The architecture is modular:

- `commercialRetail.ts` → Wall-based (your solution)
- `multifamily.ts` → Predefined matchers (placeholder)
- `commercialMall.ts` → Predefined matchers (placeholder)

Later, we can create wall-based versions for those too once you develop the logic.

---

## Expected Result

After implementation, Commercial Retail extraction should produce **exactly the same output** as your Python script:

```text
BldgId | SuitId | OccupantName | RentStart | Expiration | Sqft | BaseRent | RatePSF | ...
CV802  | 10507  | Shearz!      | 4/2/2012  | 4/30/2027  | 1,400| 2,187.50 | 18.75   | ...
```

With proper column separation and no data bleeding between columns.
