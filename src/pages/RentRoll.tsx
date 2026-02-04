// import { useMemo, useState } from "react";
// import { useTheme } from "next-themes";
// import { Moon, Sun, Upload, Wand2, FileSpreadsheet, ShieldCheck } from "lucide-react";

// import { Button } from "@/components/ui/button";
// import { Card } from "@/components/ui/card";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


// import type { ParseResult, RentRollType } from "@/features/rentroll/types";
// import { parseRentRoll } from "@/features/rentroll/parse";
// import { exportRentRollToXlsx } from "@/features/rentroll/exportExcel";

// const RENT_ROLL_TYPES: { value: RentRollType; label: string; hint: string }[] = [
//   { value: "multifamily", label: "Multi-family", hint: "Table with Unit / Tenant / Rent columns" },
//   { value: "commercial_mall", label: "Commercial (Mall)", hint: "PREIT Property Specific Rent Roll" },
//   { value: "commercial_retail", label: "Commercial (Retail)", hint: "Suite / Occupant with future rent increases" },
// ];

// function GlassShell({ children }: { children: React.ReactNode }) {
//   return (
//     <div className="min-h-screen bg-background text-foreground">
//       <div className="pointer-events-none fixed inset-0 bg-hero-pattern opacity-80" />
//       <div className="pointer-events-none fixed inset-0 bg-hero-glow" />
//       <div className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">{children}</div>
//     </div>
//   );
// }

// function ThemeToggle() {
//   const { theme, setTheme } = useTheme();
//   const isDark = theme === "dark";
//   return (
//     <Button
//       type="button"
//       variant="secondary"
//       size="icon"
//       className="glass hover:glass-strong"
//       onClick={() => setTheme(isDark ? "light" : "dark")}
//       aria-label="Toggle theme"
//     >
//       {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
//     </Button>
//   );
// }

// function DataTable({ result }: { result: ParseResult }) {
//   const { columns, rows } = result;
//   return (
//     <div className="overflow-auto rounded-lg border border-border/60">
//       <table className="min-w-full text-sm">
//         <thead className="sticky top-0 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
//           <tr>
//             {columns.map((c) => (
//               <th key={c} className="whitespace-nowrap border-b border-border/60 px-3 py-2 text-left font-medium">
//                 {c}
//               </th>
//             ))}
//           </tr>
//         </thead>
//         <tbody>
//           {rows.map((r, idx) => (
//             <tr key={idx} className="odd:bg-muted/20">
//               {columns.map((c) => (
//                 <td key={c} className="whitespace-nowrap border-b border-border/40 px-3 py-2 align-top">
//                   {String(r[c] ?? "")}
//                 </td>
//               ))}
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// export default function RentRollPage() {
//   const [file, setFile] = useState<File | null>(null);
//   const [type, setType] = useState<RentRollType>("multifamily");
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [result, setResult] = useState<ParseResult | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   const filenameBase = useMemo(() => (file?.name ? file.name.replace(/\.pdf$/i, "") : "rent-roll"), [file]);

//   async function onProcess() {
//     if (!file) return;
//     setIsProcessing(true);
//     setError(null);
//     setResult(null);
//     try {
//       const parsed = await parseRentRoll(file, type);
//       setResult(parsed);
//     } catch (e: any) {
//       setError(e?.message ?? "Failed to process the PDF.");
//     } finally {
//       setIsProcessing(false);
//     }
//   }

//   return (
//     <GlassShell>
//       <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
//         <div>
//           <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
//             <ShieldCheck className="h-3.5 w-3.5" />
//             Runs 100% in your browser (no uploads)
//           </div>
//           <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight">Rent Roll</h1>
//           <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
//             Upload a PDF, choose its layout type, click Process, then export to Excel.
//           </p>
//         </div>
//         <div className="flex items-center gap-2">
//           <ThemeToggle />
//         </div>
//       </header>

//       <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
//         <Card className="glass p-5">
//           <div className="space-y-4">
//             <div className="rounded-xl border border-border/60 bg-card/30 p-4">
//               <label className="text-sm font-medium">PDF file</label>
//               <div className="mt-2 flex items-center gap-3">
//                 <input
//                   type="file"
//                   accept="application/pdf"
//                   onChange={(e) => {
//                     const f = e.target.files?.[0] ?? null;
//                     setFile(f);
//                     setResult(null);
//                     setError(null);
//                   }}
//                   className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-secondary-foreground hover:file:bg-secondary/80"
//                 />
//               </div>
//               {file ? (
//                 <p className="mt-2 text-xs text-muted-foreground">Selected: {file.name}</p>
//               ) : (
//                 <p className="mt-2 text-xs text-muted-foreground">Choose a rent roll PDF to begin.</p>
//               )}
//             </div>

//             <div className="rounded-xl border border-border/60 bg-card/30 p-4">
//               <label className="text-sm font-medium">PDF type</label>
//               <div className="mt-2">
//                 <Select value={type} onValueChange={(v) => setType(v as RentRollType)}>
//                   <SelectTrigger className="glass">
//                     <SelectValue placeholder="Select a type" />
//                   </SelectTrigger>
//                   <SelectContent className="z-50 bg-popover/95 backdrop-blur">
//                     {RENT_ROLL_TYPES.map((t) => (
//                       <SelectItem key={t.value} value={t.value}>
//                         {t.label}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//                 <p className="mt-2 text-xs text-muted-foreground">
//                   {RENT_ROLL_TYPES.find((t) => t.value === type)?.hint}
//                 </p>
//               </div>
//             </div>

//             <div className="flex gap-3">
//               <Button
//                 type="button"
//                 className="glass-strong hover:glass-stronger w-full"
//                 disabled={!file || isProcessing}
//                 onClick={onProcess}
//               >
//                 <Wand2 className="mr-2 h-4 w-4" />
//                 {isProcessing ? "Processing…" : "Process"}
//               </Button>
//             </div>

//             <div className="rounded-xl border border-border/60 bg-card/20 p-4">
//               <div className="flex items-center gap-2 text-sm font-medium">
//                 <Upload className="h-4 w-4" />
//                 Notes
//               </div>
//               <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
//                 <li>Best results when the PDF contains selectable text (not scanned images).</li>
//                 <li>If your templates vary, we can tune each type’s column mapping.</li>
//               </ul>
//             </div>

//             {error ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</div> : null}
//           </div>
//         </Card>

//         <Card className="glass p-5">
//           <div className="w-full">
//             <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//               <div className="text-sm font-medium text-muted-foreground">Preview</div>

//               <Button
//                 type="button"
//                 variant="secondary"
//                 className="glass hover:glass-strong"
//                 disabled={!result || !result.rows.length}
//                 onClick={() => result && exportRentRollToXlsx(result, filenameBase)}
//               >
//                 <FileSpreadsheet className="mr-2 h-4 w-4" />
//                 Export Excel
//               </Button>
//             </div>

//             <div className="mt-5">
//               {!result ? (
//                 <div className="grid place-items-center rounded-2xl border border-border/60 bg-card/20 p-10 text-center">
//                   <div>
//                     <p className="text-sm font-medium">No data yet</p>
//                     <p className="mt-1 text-sm text-muted-foreground">Upload a PDF and click Process to preview the extracted table.</p>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="space-y-4">
//                   {result.meta?.warnings?.length ? (
//                     <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
//                       <div className="font-medium text-foreground">Parsing notes</div>
//                       <ul className="mt-1 list-disc space-y-1 pl-5">
//                         {result.meta.warnings.map((w, i) => (
//                           <li key={i}>{w}</li>
//                         ))}
//                       </ul>
//                     </div>
//                   ) : null}

//                   <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
//                     <span className="rounded-full border border-border/60 bg-card/30 px-2 py-1 backdrop-blur">
//                       Rows: {result.rows.length}
//                     </span>
//                     <span className="rounded-full border border-border/60 bg-card/30 px-2 py-1 backdrop-blur">
//                       Pages: {result.meta?.pages ?? "—"}
//                     </span>
//                   </div>

//                   <DataTable result={result} />
//                 </div>
//               )}
//             </div>
//           </div>
//         </Card>
//       </div>
//     </GlassShell>
//   );
// }
