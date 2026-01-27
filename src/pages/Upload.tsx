import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Upload as UploadIcon, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RentRollType } from "@/features/rentroll/types";
import { useRentRollSession } from "@/features/rentroll/ui/rentroll-session";

const RENT_ROLL_TYPES: { value: RentRollType; label: string; hint: string }[] = [
  { value: "multifamily", label: "Multi-family", hint: "Table with Unit / Tenant / Rent columns" },
  { value: "commercial_mall", label: "Commercial (Mall)", hint: "PREIT Property Specific Rent Roll" },
  { value: "commercial_retail", label: "Commercial (Retail)", hint: "Suite / Occupant with future rent increases" },
];

export default function UploadPage() {
  const navigate = useNavigate();
  const { file, type, setFile, setType, isProcessing, process, result, error } = useRentRollSession();

  const filenameBase = useMemo(() => (file?.name ? file.name.replace(/\.pdf$/i, "") : "rent-roll"), [file]);
  const canGoNext = Boolean(result?.rows?.length);

  return (
    <div>
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
        <Card className="glass p-5">
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
              <div className="mt-2">
                <Select value={type} onValueChange={(v) => setType(v as RentRollType)}>
                  <SelectTrigger className="glass">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover/95 backdrop-blur">
                    {RENT_ROLL_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-xs text-muted-foreground">{RENT_ROLL_TYPES.find((t) => t.value === type)?.hint}</p>
              </div>
            </div>

            <div className="relative z-10 flex gap-3">
              <Button
                type="button"
                variant="default"
                className="glass-strong hover:glass-stronger w-full disabled:opacity-80 disabled:bg-card/20 disabled:text-foreground/70"
                disabled={!file || isProcessing}
                onClick={process}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                {isProcessing ? "Processing…" : "Process"}
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="glass hover:glass-strong w-full"
                disabled={!canGoNext}
                onClick={() => navigate("/extract", { state: { filenameBase } })}
              >
                Go to Extract
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

        <Card className="glass p-5">
          <div className="grid place-items-center rounded-2xl border border-border/60 bg-card/20 p-10 text-center">
            <div>
              <p className="text-sm font-medium">Next step: Extract</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {result?.rows?.length
                  ? `Ready: ${result.rows.length} rows extracted. Click “Go to Extract”.`
                  : "Process a PDF to generate the extracted table."}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
