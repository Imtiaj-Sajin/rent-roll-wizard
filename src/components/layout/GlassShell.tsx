export default function GlassShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* layered patterns */}
      <div className="pointer-events-none fixed inset-0 bg-hero-glow" />
      <div className="pointer-events-none fixed inset-0 bg-hero-pattern opacity-70" />
      <div className="pointer-events-none fixed inset-0 bg-pattern-dots opacity-30" />
      <div className="pointer-events-none fixed inset-0 bg-pattern-grid opacity-15" />
      <div className="relative min-h-screen">{children}</div>
    </div>
  );
}
