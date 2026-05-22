/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  Loader2, FileText, BarChart2, Download, Users, Layers, Table2, Clock,
  Search, ChevronDown, ArrowUpDown,
} from "lucide-react";

import { authHeader } from "@/contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://api.rentroll.bulkscraper.cloud";

interface UsageRow {
  id: number;
  user_id: number;
  username: string;
  full_name: string;
  designation: string | null;
  filename: string;
  rent_roll_type: string;
  pages: number;
  rows_extracted: number;
  columns_count: number;
  tenants: number;
  downloads: number;
  warnings_count: number;
  file_size_bytes: number;
  processing_ms: number;
  uploaded_at: string | null;
  finished_at: string | null;
  used_at: string;
}

const fmtDuration = (ms: number): string => {
  if (!ms || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return rs ? `${m}m ${rs}s` : `${m}m`;
};

type TimeRange = "today" | "week" | "all";
type SortKey = "files" | "rows" | "tenants" | "downloads" | "lastActive";

// Backend stores TIMESTAMP in Asia/Dhaka and returns as a naive string.
// JS `new Date("2026-05-18T08:57:39")` parses naive ISO as LOCAL → already correct
// IF the user's machine is also +06:00. To be robust across timezones, parse as
// if it were UTC+6 and let toLocaleString handle the rest.
const parseTimestamp = (iso: string): Date => {
  if (!iso) return new Date(NaN);
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso);
  if (hasTz) return new Date(iso);
  // Treat naive string as Asia/Dhaka time
  const normalised = iso.includes("T") ? iso : iso.replace(" ", "T");
  return new Date(`${normalised}+06:00`);
};

const fmtDateTime = (iso: string) =>
  parseTimestamp(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

const fmtRelative = (iso: string): string => {
  const then = parseTimestamp(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return parseTimestamp(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const isInRange = (iso: string, range: TimeRange): boolean => {
  if (range === "all") return true;
  const t = parseTimestamp(iso).getTime();
  if (isNaN(t)) return false;
  if (range === "today") return t >= Date.now() - 24 * 60 * 60 * 1000;
  return t >= Date.now() - 7 * 24 * 60 * 60 * 1000;
};

const StatCard = ({
  icon: Icon, label, value,
}: { icon: any; label: string; value: number }) => (
  <div className="bg-card border border-border/60 rounded-xl p-4 flex items-center gap-3">
    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xl font-bold leading-none tabular-nums">{value.toLocaleString()}</p>
      <p className="text-[11px] text-muted-foreground mt-1 truncate">{label}</p>
    </div>
  </div>
);

interface UserSummary {
  user_id: number;
  username: string;
  full_name: string;
  designation: string | null;
  files: number;
  rows: number;
  tenants: number;
  downloads: number;
  sessions: number;
  lastActive: string;
  layoutCounts: Record<string, number>;
  rowsRaw: UsageRow[];
}

const UserCard = ({
  summary, expanded, onToggle,
}: { summary: UserSummary; expanded: boolean; onToggle: () => void }) => {
  const initials = (summary.full_name || summary.username)
    .split(/\s+/).map((s) => s[0]?.toUpperCase() ?? "").slice(0, 2).join("") || "?";

  return (
    <div
      className={`bg-card border rounded-xl overflow-hidden transition-all
      ${expanded ? "border-primary shadow-sm" : "border-border/60 hover:border-primary/30"}`}
    >
      <button className="w-full flex items-center gap-4 p-3 text-left" onClick={onToggle}>
        <div className="w-10 h-10 rounded-full bg-primary/15 text-primary font-semibold text-sm flex items-center justify-center shrink-0">
          {initials}
        </div>

        <div className="min-w-0 w-56 sm:w-64 shrink-0">
          <p className="font-semibold text-sm truncate">{summary.full_name || summary.username}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {summary.username}
            {summary.designation ? ` · ${summary.designation}` : ""}
          </p>
        </div>

        <div className="hidden md:flex items-center gap-5 flex-1 min-w-0">
          <Stat label="Files" value={summary.files} />
          <Stat label="Rows" value={summary.rows} />
          <Stat label="Tenants" value={summary.tenants} />
          <Stat label="Downloads" value={summary.downloads} />
        </div>

        <div className="hidden lg:flex flex-col items-end text-[11px] text-muted-foreground shrink-0 min-w-[120px]">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {fmtRelative(summary.lastActive)}
          </span>
          <span className="text-muted-foreground/70">
            {summary.sessions} session{summary.sessions !== 1 ? "s" : ""}
          </span>
        </div>

        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {Object.keys(summary.layoutCounts).length > 0 && (
        <div className="px-4 py-2 border-t border-border/60 bg-muted/20 flex flex-wrap gap-1.5 text-[10px]">
          {Object.entries(summary.layoutCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => (
              <span key={type} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {count} {type.replace(/_/g, " ")}
              </span>
            ))}
        </div>
      )}

      {expanded && (
        <div className="border-t border-border/60">
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium uppercase tracking-wide text-[10px]">Uploaded</th>
                  <th className="text-left px-3 py-2 font-medium uppercase tracking-wide text-[10px]">Finished</th>
                  <th className="text-right px-3 py-2 font-medium uppercase tracking-wide text-[10px]">Taken</th>
                  <th className="text-left px-3 py-2 font-medium uppercase tracking-wide text-[10px]">Filename</th>
                  <th className="text-left px-3 py-2 font-medium uppercase tracking-wide text-[10px]">Layout</th>
                  <th className="text-right px-3 py-2 font-medium uppercase tracking-wide text-[10px]">Pages</th>
                  <th className="text-right px-3 py-2 font-medium uppercase tracking-wide text-[10px]">Rows</th>
                  <th className="text-right px-3 py-2 font-medium uppercase tracking-wide text-[10px]">Cols</th>
                  <th className="text-right px-3 py-2 font-medium uppercase tracking-wide text-[10px]">Tenants</th>
                  <th className="text-right px-3 py-2 font-medium uppercase tracking-wide text-[10px]">Downloads</th>
                </tr>
              </thead>
              <tbody>
                {summary.rowsRaw.map((r, i) => {
                  const taken = r.uploaded_at && r.finished_at
                    ? parseTimestamp(r.finished_at).getTime() - parseTimestamp(r.uploaded_at).getTime()
                    : r.processing_ms;
                  return (
                    <tr key={r.id} className={`border-b border-border/60 last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmtDateTime(r.uploaded_at ?? r.used_at)}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.finished_at ? fmtDateTime(r.finished_at) : <span className="text-muted-foreground/50">—</span>}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtDuration(taken)}</td>
                      <td className="px-3 py-2 max-w-[260px] truncate" title={r.filename}>{r.filename || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{(r.rent_roll_type || "").replace(/_/g, " ")}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.pages || <span className="text-muted-foreground/50">—</span>}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.rows_extracted || <span className="text-muted-foreground/50">—</span>}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.columns_count || <span className="text-muted-foreground/50">—</span>}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.tenants || <span className="text-muted-foreground/50">—</span>}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.downloads || <span className="text-muted-foreground/50">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-baseline gap-1.5 min-w-0">
    <span className="text-sm font-bold tabular-nums">{value.toLocaleString()}</span>
    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
  </div>
);

export default function UsagePage() {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<TimeRange>("week");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastActive");
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/usage`, { headers: { ...authHeader() } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: UsageRow[]) => setRows(data))
      .catch(async (r: any) => {
        const msg = r?.json ? (await r.json().catch(() => null))?.detail : null;
        setError(msg || "Failed to load usage");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => rows.filter((r) => isInRange(r.used_at, range)), [rows, range]);

  const totals = useMemo(() => {
    const t = { users: 0, sessions: 0, files: 0, rows: 0, tenants: 0, downloads: 0 };
    for (const r of filtered) {
      t.sessions++;
      t.files += r.rows_extracted > 0 || r.pages > 0 ? 1 : 0;
      t.rows += r.rows_extracted;
      t.tenants += r.tenants;
      t.downloads += r.downloads;
    }
    t.users = new Set(filtered.map((r) => r.user_id)).size;
    return t;
  }, [filtered]);

  const summaries = useMemo<UserSummary[]>(() => {
    const map = new Map<number, UserSummary>();
    for (const r of filtered) {
      const cur = map.get(r.user_id);
      if (cur) {
        cur.files += r.rows_extracted > 0 || r.pages > 0 ? 1 : 0;
        cur.rows += r.rows_extracted;
        cur.tenants += r.tenants;
        cur.downloads += r.downloads;
        cur.sessions++;
        if (parseTimestamp(r.used_at) > parseTimestamp(cur.lastActive)) cur.lastActive = r.used_at;
        if (r.rent_roll_type) cur.layoutCounts[r.rent_roll_type] = (cur.layoutCounts[r.rent_roll_type] || 0) + 1;
        cur.rowsRaw.push(r);
      } else {
        const layoutCounts: Record<string, number> = {};
        if (r.rent_roll_type) layoutCounts[r.rent_roll_type] = 1;
        map.set(r.user_id, {
          user_id: r.user_id,
          username: r.username,
          full_name: r.full_name,
          designation: r.designation,
          files: r.rows_extracted > 0 || r.pages > 0 ? 1 : 0,
          rows: r.rows_extracted,
          tenants: r.tenants,
          downloads: r.downloads,
          sessions: 1,
          lastActive: r.used_at,
          layoutCounts,
          rowsRaw: [r],
        });
      }
    }
    for (const s of map.values()) {
      s.rowsRaw.sort((a, b) => parseTimestamp(b.used_at).getTime() - parseTimestamp(a.used_at).getTime());
    }
    return Array.from(map.values());
  }, [filtered]);

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filteredList = q
      ? summaries.filter((u) =>
          u.username.toLowerCase().includes(q)
          || (u.full_name || "").toLowerCase().includes(q)
          || (u.designation || "").toLowerCase().includes(q))
      : summaries;
    return [...filteredList].sort((a, b) => {
      switch (sortKey) {
        case "files":      return b.files - a.files;
        case "rows":       return b.rows - a.rows;
        case "tenants":    return b.tenants - a.tenants;
        case "downloads":  return b.downloads - a.downloads;
        case "lastActive": return parseTimestamp(b.lastActive).getTime() - parseTimestamp(a.lastActive).getTime();
      }
    });
  }, [summaries, search, sortKey]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "lastActive", label: "Last active" },
    { key: "files", label: "Files" },
    { key: "rows", label: "Rows" },
    { key: "tenants", label: "Tenants" },
    { key: "downloads", label: "Downloads" },
  ];
  const timeOptions: { key: TimeRange; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This week" },
    { key: "all", label: "All time" },
  ];

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <img src="/favicon.ico" alt="Rent Roll Wizard" className="w-9 h-9 rounded-lg" />
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Usage</h1>
          <p className="text-sm text-muted-foreground mt-1">Activity across all users on Rent Roll Wizard.</p>
        </div>
      </header>

      <div className="flex items-center gap-1 bg-muted p-1 rounded-lg w-fit">
        {timeOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setRange(opt.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all
              ${range === opt.key ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={Users}     label="Active users"   value={totals.users} />
          <StatCard icon={Layers}    label="Sessions"       value={totals.sessions} />
          <StatCard icon={FileText}  label="Files processed" value={totals.files} />
          <StatCard icon={Table2}    label="Rows extracted" value={totals.rows} />
          <StatCard icon={BarChart2} label="Tenants"        value={totals.tenants} />
          <StatCard icon={Download}  label="Downloads"      value={totals.downloads} />
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 text-center">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, username, or designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-card border border-border/60 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="relative">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="h-9 pl-8 pr-8 bg-card border border-border/60 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer"
            >
              {sortOptions.map((o) => <option key={o.key} value={o.key}>Sort: {o.label}</option>)}
            </select>
            <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      )}

      {!loading && !error && (
        displayed.length === 0 ? (
          <div className="bg-card border border-border/60 rounded-xl py-16 text-center text-sm text-muted-foreground">
            {search
              ? `No users matching "${search}"`
              : range === "today"
                ? "No activity in the last 24 hours."
                : range === "week"
                  ? "No activity in the last 7 days."
                  : "No activity yet."}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {displayed.map((u) => (
              <UserCard
                key={u.user_id}
                summary={u}
                expanded={expandedUserId === u.user_id}
                onToggle={() => setExpandedUserId((prev) => (prev === u.user_id ? null : u.user_id))}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
