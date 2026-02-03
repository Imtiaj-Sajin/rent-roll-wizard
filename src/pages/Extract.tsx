import { useLocation, useNavigate } from "react-router-dom";
import { FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { exportRentRollToXlsx } from "@/features/rentroll/exportExcel";
import { useRentRollSession } from "@/features/rentroll/ui/rentroll-session";
import { RentRollTable } from "@/features/rentroll/ui/rentroll-table";

export default function ExtractPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { result, file } = useRentRollSession();

  const filenameBase =
    (location.state as any)?.filenameBase ?? (file?.name ? file.name.replace(/\.pdf$/i, "") : "rent-roll");

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-balance text-4xl font-semibold tracking-tight">Extract</h1>
        <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">Review the extracted table, then export to Excel.</p>
      </header>

      <Card className="glass p-5">
        <div className="w-full">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-medium text-muted-foreground">Preview</div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="glass hover:glass-strong"
                onClick={() => navigate("/upload")}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="glass hover:glass-strong"
                disabled={!result || !result.rows.length}
                onClick={() => result && exportRentRollToXlsx(result, filenameBase)}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>

          <div className="mt-5">
            {!result ? (
              <div className="grid place-items-center rounded-2xl border border-border/60 bg-card/20 p-10 text-center">
                <div>
                  <p className="text-sm font-medium">No data yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Go to Upload, process a PDF, then return here.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {result.meta?.warnings?.length ? (
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
                    <div className="font-medium text-foreground">Parsing notes</div>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {result.meta.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border/60 bg-card/30 px-2 py-1 backdrop-blur">Rows: {result.rows.length}</span>
                  <span className="rounded-full border border-border/60 bg-card/30 px-2 py-1 backdrop-blur">Pages: {result.meta?.pages ?? "—"}</span>
                </div>

                <RentRollTable result={result} />
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
