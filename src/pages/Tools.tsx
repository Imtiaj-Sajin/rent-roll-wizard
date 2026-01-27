import { Card } from "@/components/ui/card";

export default function ToolsPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-balance text-4xl font-semibold tracking-tight">Tools</h1>
        <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">Utilities and helpers for rent roll workflows.</p>
      </header>

      <Card className="glass p-5">
        <div className="rounded-2xl border border-border/60 bg-card/20 p-6">
          <p className="text-sm text-muted-foreground">Coming soon: template tuning, column mapping, and validation helpers.</p>
        </div>
      </Card>
    </div>
  );
}
