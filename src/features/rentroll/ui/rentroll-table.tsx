import type { ParseResult } from "@/features/rentroll/types";

export function RentRollTable({ result }: { result: ParseResult }) {
  const { columns, rows } = result;

  return (
    <div className="overflow-auto rounded-lg border border-border/60">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
          <tr>
            {columns.map((c) => (
              <th key={c} className="whitespace-nowrap border-b border-border/60 px-3 py-2 text-left font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="odd:bg-muted/20">
              {columns.map((c) => (
                <td key={c} className="whitespace-nowrap border-b border-border/40 px-3 py-2 align-top">
                  {String(r[c] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
