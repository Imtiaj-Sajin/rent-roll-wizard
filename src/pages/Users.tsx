import { Card } from "@/components/ui/card";

export default function UsersPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-balance text-4xl font-semibold tracking-tight">Users</h1>
        <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">User management (placeholder page — no backend).</p>
      </header>

      <Card className="glass p-5">
        <div className="rounded-2xl border border-border/60 bg-card/20 p-6">
          <p className="text-sm text-muted-foreground">
            This project is intentionally frontend-only for privacy. If you ever want real users/logins, we can add it with Lovable Cloud.
          </p>
        </div>
      </Card>
    </div>
  );
}
