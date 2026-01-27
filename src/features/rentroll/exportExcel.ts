import * as XLSX from "xlsx";
import type { ParseResult } from "./types";

export function exportRentRollToXlsx(result: ParseResult, filenameBase: string) {
  const safeBase = filenameBase.replace(/[^a-z0-9\-_. ]/gi, "").trim() || "rent-roll";
  const ws = XLSX.utils.json_to_sheet(result.rows, { header: result.columns });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rent Roll");
  XLSX.writeFile(wb, `${safeBase}.xlsx`);
}
