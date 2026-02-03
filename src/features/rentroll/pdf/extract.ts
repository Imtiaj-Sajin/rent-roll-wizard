import * as pdfjsLib from "pdfjs-dist";
// Vite-friendly worker URL
// eslint-disable-next-line import/no-unresolved
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfTextItem = {
  str: string;
  x: number;   // x0 (start position)
  x1: number;  // end position (x + width)
  y: number;
  w: number;
};

export type PdfPageText = {
  pageNumber: number;
  items: PdfTextItem[];
  width: number;  // page width for column boundary calculations
};

export async function extractPdfPagesText(file: File): Promise<PdfPageText[]> {
  const data = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;

  const pages: PdfPageText[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });

    const items: PdfTextItem[] = (textContent.items as any[])
      .map((it) => {
        const str = String(it.str ?? "").replace(/\s+/g, " ").trim();
        if (!str) return null;

        // PDF.js transform: [a, b, c, d, e, f] where e=x, f=y
        const t = it.transform as number[] | undefined;
        const x = t?.[4] ?? 0;
        const y = t?.[5] ?? 0;
        const w = (it.width as number | undefined) ?? 0;
        const x1 = x + w;  // end position
        return { str, x, x1, y, w } satisfies PdfTextItem;
      })
      .filter(Boolean) as PdfTextItem[];

    pages.push({ pageNumber, items, width: viewport.width });
  }

  return pages;
}

export function pageItemsToPlainText(page: PdfPageText): string {
  // Group into lines by y buckets, then join by x
  const bucketSize = 2.5;
  const byLine = new Map<number, PdfTextItem[]>();
  for (const it of page.items) {
    const key = Math.round(it.y / bucketSize) * bucketSize;
    const arr = byLine.get(key) ?? [];
    arr.push(it);
    byLine.set(key, arr);
  }

  const lines = Array.from(byLine.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, arr]) => arr.sort((a, b) => a.x - b.x).map((x) => x.str).join(" "));

  return lines.join("\n");
}
