// src\pages\Upload.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Upload as UploadIcon, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RentRollType } from "@/features/rentroll/types";
import { useRentRollSession } from "@/features/rentroll/ui/rentroll-session";

const RENT_ROLL_TYPES: { value: RentRollType; label: string; hint: string; available: boolean; image?: string }[] = [
  { 
    value: "commercial_retail", 
    label: "Commercial (Retail)", 
    hint: "Suite / Occupant with future rent increases", 
    available: true,
    image: "/templates/commercial%20retail.png"
  },
  { 
    value: "multifamily", 
    label: "Multi-family", 
    hint: "Grid-based extraction with row merging", 
    available: true,
    image: "/templates/multifamily.png"
  },
  { 
    value: "guardian_storage", 
    label: "Guardian Storage (Seven Fields)", 
    hint: "Dynamic column detection with nearest-column assignment", 
    available: true,
    image: "/templates/GS%20Seven%20Fields.jpg"
  },
  { 
    value: "ga_portfolio", 
    label: "GA Portfolio", 
    hint: "asdf", 
    available: true,
    image: "/templates/GA portfolio.png"
  },
  { 
    value: "commercial_mall", 
    label: "Commercial (Mall)", 
    hint: "Coming soon", 
    available: false 
  },
];

export default function UploadPage() {
  const navigate = useNavigate();
  const { file, type, setFile, setType, isProcessing, process, result, error } = useRentRollSession();
  
  // State to track which item is being hovered for the large preview
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  const filenameBase = useMemo(() => (file?.name ? file.name.replace(/\.pdf$/i, "") : "rent-roll"), [file]);
  const canGoNext = Boolean(result?.rows?.length);

  const hoveredData = useMemo(() => RENT_ROLL_TYPES.find((t) => t.value === hoveredType), [hoveredType]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" />
            Runs 100% in your browser (no uploads)
          </div>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight">Upload</h1>
          <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
            Select a PDF, choose its layout type, then click Process.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card className="glass relative z-20 p-5">
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-card/30 p-4">
              <label className="text-sm font-medium">PDF file</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-secondary-foreground hover:file:bg-secondary/80"
                />
              </div>
              {file ? (
                <p className="mt-2 text-xs text-muted-foreground">Selected: {file.name}</p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Choose a rent roll PDF to begin.</p>
              )}
            </div>

            <div className="rounded-xl border border-border/60 bg-card/30 p-4">
              <label className="text-sm font-medium">PDF type</label>
              
              {/* Changed to grid-cols-3 for tighter packing and future scaling */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                {RENT_ROLL_TYPES.map((t) => {
                  const isSelected = type === t.value;

                  return (
                    <div
                      key={t.value}
                      onClick={() => t.available && setType(t.value)}
                      onMouseEnter={() => setHoveredType(t.value)}
                      onMouseLeave={() => setHoveredType(null)}
                      className={`group relative rounded-xl border p-2 transition-all ${
                        t.available
                          ? "cursor-pointer"
                          : "cursor-not-allowed opacity-60 grayscale"
                      } ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border/60 bg-card/30 hover:border-primary/50 hover:bg-card/50"
                      }`}
                    >
                      {/* Thumbnail Image */}
                      {t.image ? (
                        <div className="relative h-16 w-full overflow-hidden rounded-md border border-border/50 bg-muted/50 sm:h-20">
                          <img
                            src={t.image}
                            alt={t.label}
                            className="h-full w-full object-cover object-top"
                          />
                        </div>
                      ) : (
                        <div className="flex h-16 w-full items-center justify-center rounded-md border border-border/50 bg-muted/50 text-xs text-muted-foreground sm:h-20">
                          None
                        </div>
                      )}
                      
                      {/* Label */}
                      <div className="mt-2 text-center text-[11px] font-medium leading-tight">
                        {t.label}
                        {!t.available && (
                          <div className="mt-0.5 text-[9px] text-muted-foreground">
                            (Soon)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Hint:</span>{" "}
                {RENT_ROLL_TYPES.find((t) => t.value === type)?.hint}
              </p>
            </div>

            <div className="relative z-10 flex gap-3">
              <Button
                type="button"
                variant="default"
                className="w-full shadow-sm disabled:opacity-60"
                disabled={!file || isProcessing}
                onClick={process}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                {isProcessing ? "Processing…" : "Process"}
              </Button>
            </div>

            <div className="rounded-xl border border-border/60 bg-card/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <UploadIcon className="h-4 w-4" />
                Notes
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                <li>Best results when the PDF contains selectable text (not scanned images).</li>
                <li>After processing, open Extract to review and export.</li>
              </ul>
            </div>

            {error ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</div> : null}
          </div>
        </Card>

        {/* Right Card */}
        <Card className="glass-strong relative z-10 p-5">
          <div className="rounded-2xl border border-border/60 bg-card/15 p-6">
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-sm font-medium">Next step: Extract</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result?.rows?.length
                    ? "We extracted a table from your PDF. Review it and export to Excel."
                    : "Process a PDF to generate the extracted table."}
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-card/10 p-4">
                <div className="text-sm font-medium">Summary</div>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">File</dt>
                    <dd className="mt-1 truncate">{file?.name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Type</dt>
                    <dd className="mt-1">{RENT_ROLL_TYPES.find((t) => t.value === type)?.label ?? type}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Pages</dt>
                    <dd className="mt-1">{result?.meta?.pages ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Rows</dt>
                    <dd className="mt-1">{result?.rows?.length ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Columns</dt>
                    <dd className="mt-1">{result?.columns?.length ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Warnings</dt>
                    <dd className="mt-1">{result?.meta?.warnings?.length ?? 0}</dd>
                  </div>
                </dl>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="default"
                  className=" w-full"
                  disabled={!canGoNext}
                  onClick={() => navigate("/extract", { state: { filenameBase } })}
                >
                  Go to Extract
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Massive Hover Preview Portal */}
      {hoveredData?.image && hoveredData.available && (
        <div className="pointer-events-none fixed right-8 top-1/2 z-[100] hidden h-[85vh] w-[600px] max-w-[calc(100vw-480px)] -translate-y-1/2 flex-col items-center justify-center rounded-2xl border border-border/60 bg-card p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 lg:flex xl:w-[750px]">
          <div className="relative h-full w-full overflow-hidden rounded-xl border border-border/50 bg-muted/20">
            <img
              src={hoveredData.image}
              alt={hoveredData.label}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full border border-border/50 bg-background/95 px-6 py-2 text-center shadow-xl backdrop-blur">
            <div className="text-sm font-semibold text-foreground">
              {hoveredData.label}
            </div>
            <div className="text-xs text-muted-foreground">
              {hoveredData.hint}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}