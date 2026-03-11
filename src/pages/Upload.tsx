// src\pages\Upload.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Upload as UploadIcon, Wand2, FileText, CheckCircle2, FileUp, Sparkles, ArrowRight } from "lucide-react";

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
    value: "shopping_mall", 
    label: "Shopping Mall", 
    hint: "Dynamic header detection with rectangle-based column boundaries", 
    available: true,
    image: "/templates/shopping%20mall.png"
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
  
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const filenameBase = useMemo(() => (file?.name ? file.name.replace(/\.pdf$/i, "") : "rent-roll"), [file]);
  const canGoNext = Boolean(result?.rows?.length);

  const hoveredData = useMemo(() => RENT_ROLL_TYPES.find((t) => t.value === hoveredType), [hoveredType]);

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl animate-in fade-in duration-700">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between slide-in-from-bottom-4 animate-in duration-700">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary shadow-[0_0_15px_rgba(var(--primary),0.1)] backdrop-blur transition-all hover:bg-primary/15">
            <ShieldCheck className="h-4 w-4" />
            Runs 100% in your browser (no uploads)
          </div>
          <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight text-foreground">Extract Rent Roll Data</h1>
          <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
            Select a PDF layout, drag your file below, and let our engine map it to Excel perfectly.
          </p>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[440px_1fr]">
        
        {/* Left Card: Upload & Configuration */}
        <Card className="glass relative z-20 p-6 shadow-xl slide-in-from-bottom-8 animate-in duration-700 delay-150">
          <div className="space-y-6">
            
            {/* File Upload Zone */}
            <div className="space-y-2">
              <label className="text-sm font-semibold tracking-tight text-foreground">PDF Document</label>
              
              <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2   border-dashed p-8 transition-all duration-300 ease-out ${
                  isDragging
                    ? "scale-[1.02] border-primary bg-primary/10 shadow-[0_0_30px_rgba(var(--primary),0.15)]"
                    : "border-border  bg-red-300/10 hover:border-primary/50 hover:bg-red-300/30 hover:shadow-lg hover:shadow-primary/5"
                }`}
              >
 
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                
                {file ? (
                  <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                    <div className="mb-3 rounded-full bg-primary/10 p-3 text-primary ring-1 ring-primary/20">
                      <FileText className="h-8 w-8" />
                    </div>
                    <p className="max-w-[280px] truncate text-sm font-semibold text-foreground">
                      {file.name}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Ready to process
                    </div>
                    <p className="mt-3 text-[11px] text-muted-foreground transition-colors group-hover:text-foreground">
                      Click or drag a new file to replace
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <div className={`mb-4 rounded-full bg-muted/50 p-4 transition-transform duration-300 ease-out ${isDragging ? "-translate-y-2 scale-110 bg-primary/20 text-primary" : "group-hover:-translate-y-1 group-hover:bg-primary/10 group-hover:text-primary"}`}>
                      <FileUp className="h-8 w-8" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      Click to browse <span className="font-normal text-muted-foreground">or drag PDF here</span>
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">Supports searchable PDF files</p>
                  </div>
                )}
              </label>
            </div>

            {/* Layout Type Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold tracking-tight text-foreground">Layout Template</label>
              </div>
              
              <div className="mt-2 grid grid-cols-3 gap-3">
                {RENT_ROLL_TYPES.map((t) => {
                  const isSelected = type === t.value;

                  return (
                    <div
                      key={t.value}
                      onClick={() => t.available && setType(t.value)}
                      onMouseEnter={() => setHoveredType(t.value)}
                      onMouseLeave={() => setHoveredType(null)}
                      className={`group relative flex flex-col items-center rounded-xl border p-2.5 transition-all duration-300 ease-out ${
                        t.available
                          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
                          : "cursor-not-allowed opacity-50 grayscale"
                      } ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-border/50 bg-card/20 hover:border-primary/40 hover:bg-card/40"
                      }`}
                    >
                      {/* Image Thumbnail with Overflow Hidden for Zoom effect */}
                      {t.image ? (
                        <div className="relative h-16 w-full overflow-hidden rounded-lg border border-border/40 bg-muted/30 sm:h-20">
                          <img
                            src={t.image}
                            alt={t.label}
                            className={`h-full w-full object-cover object-top transition-transform duration-500 ease-out ${t.available ? "group-hover:scale-110" : ""}`}
                          />
                          {/* Selected Overlay Glow */}
                          {isSelected && <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />}
                        </div>
                      ) : (
                        <div className="flex h-16 w-full items-center justify-center rounded-lg border border-border/40 bg-muted/30 text-xs text-muted-foreground sm:h-20">
                          None
                        </div>
                      )}
                      
                      <div className="mt-2.5 text-center text-[11px] font-medium leading-tight text-foreground/90">
                        {t.label}
                        {!t.available && (
                          <div className="mt-0.5 text-[9px] text-muted-foreground/80">
                            (Soon)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Hint Display */}
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                <p>
                  <span className="font-semibold text-foreground/80">Pro tip:</span>{" "}
                  {RENT_ROLL_TYPES.find((t) => t.value === type)?.hint}
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <Button
                type="button"
                size="lg"
                className="group relative w-full overflow-hidden text-sm font-semibold transition-all hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] disabled:opacity-60"
                disabled={!file || isProcessing}
                onClick={process}
              >
                {/* Subtle shine effect on button */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                
                {isProcessing ? (
                  <>
                    <Wand2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Document...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                    Process Rent Roll
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="animate-in slide-in-from-top-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive shadow-sm">
                {error}
              </div>
            )}
          </div>
        </Card>

        {/* Right Card: Summary & Next Steps */}
        <Card className="glass-strong relative z-10 p-6 shadow-xl slide-in-from-bottom-12 animate-in duration-700 delay-300">
          <div className="flex h-full flex-col justify-between gap-6">
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Extraction Summary</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result?.rows?.length
                    ? "Table extracted successfully. Review the stats below and proceed to export."
                    : "Awaiting document processing. Your results will appear here."}
                </p>
              </div>

              {/* Premium Stats Grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                
                <div className="flex flex-col justify-center space-y-1 rounded-xl border border-border/50 bg-background/40 p-3.5 shadow-sm transition-colors hover:bg-background/80">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Filename</span>
                  <span className="truncate text-sm font-semibold text-foreground">{file?.name ?? "—"}</span>
                </div>
                
                <div className="flex flex-col justify-center space-y-1 rounded-xl border border-border/50 bg-background/40 p-3.5 shadow-sm transition-colors hover:bg-background/80">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Layout Detected</span>
                  <span className="text-sm font-semibold text-foreground">{RENT_ROLL_TYPES.find((t) => t.value === type)?.label ?? type}</span>
                </div>

                <div className="flex flex-col justify-center space-y-1 rounded-xl border border-border/50 bg-background/40 p-3.5 shadow-sm transition-colors hover:bg-background/80">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Pages</span>
                  <span className="text-sm font-semibold text-foreground">{result?.meta?.pages ?? "—"}</span>
                </div>

                <div className="flex flex-col justify-center space-y-1 rounded-xl border border-border/50 bg-background/40 p-3.5 shadow-sm transition-colors hover:bg-background/80">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Rows Extracted</span>
                  <span className="text-sm font-semibold text-foreground">
                    {result?.rows?.length ? (
                      <span className="text-primary">{result.rows.length} rows</span>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>

                <div className="flex flex-col justify-center space-y-1 rounded-xl border border-border/50 bg-background/40 p-3.5 shadow-sm transition-colors hover:bg-background/80">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Columns</span>
                  <span className="text-sm font-semibold text-foreground">{result?.columns?.length ?? "—"}</span>
                </div>

                <div className="flex flex-col justify-center space-y-1 rounded-xl border border-border/50 bg-background/40 p-3.5 shadow-sm transition-colors hover:bg-background/80">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Warnings</span>
                  <span className="text-sm font-semibold text-foreground">
                    {result?.meta?.warnings?.length ? (
                      <span className="text-amber-500">{result.meta.warnings.length} warnings</span>
                    ) : (
                      "0"
                    )}
                  </span>
                </div>

              </div>
            </div>

            <div className="pt-4">
              <Button
                type="button"
                size="lg"
                variant={canGoNext ? "default" : "secondary"}
                className={`group w-full text-sm font-semibold transition-all ${canGoNext ? "shadow-md hover:shadow-xl" : ""}`}
                disabled={!canGoNext}
                onClick={() => navigate("/extract", { state: { filenameBase } })}
              >
                Continue to Review
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </div>
            
          </div>
        </Card>
      </div>

      {/* Massive Hover Preview Portal */}
      {hoveredData?.image && hoveredData.available && (
        <div className="pointer-events-none fixed right-8 top-1/2 z-[100] hidden h-[85vh] w-[600px] max-w-[calc(100vw-480px)] -translate-y-1/2 flex-col items-center justify-center rounded-2xl border border-border/60 bg-background/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 lg:flex xl:w-[750px]">
          <div className="relative h-full w-full overflow-hidden rounded-xl border border-border/50 bg-muted/20 shadow-inner">
            <img
              src={hoveredData.image}
              alt={hoveredData.label}
              className="h-full w-full object-contain drop-shadow-lg"
            />
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full border border-border/50 bg-background/95 px-6 py-2.5 text-center shadow-2xl backdrop-blur">
            <div className="text-sm font-semibold text-foreground">
              {hoveredData.label}
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-muted-foreground">
              {hoveredData.hint}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}