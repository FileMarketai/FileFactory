// File: FileFactory/app/admintasks/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Admin view: Team-wise TODOS across all Team Leads and Members.
 *
 * API contract (recommended):
 * GET /api/admin/todos/teams?from=YYYY-MM-DD&to=YYYY-MM-DD&status=all|complete|incomplete|status&q=...&page=1&pageSize=6
 * Response:
 * {
 *   teams: TeamTodoBlock[];
 *   totalTeams: number;
 *   overall?: { total, completed, incomplete, pending, completionRate }
 * }
 */

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const text = await res.text();

  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`API returned non-JSON (status ${res.status}). Check route: ${url}`);
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed (status ${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

type TodoStatus = "STATUS" | "INCOMPLETE" | "COMPLETE";

type TodoItem = {
  id: string;
  title: string;
  note?: string | null;
  status: TodoStatus;
  day: string; // YYYY-MM-DD (normalized)
  createdAt: string;
  updatedAt: string;
};

type MemberTodo = {
  userId: string;
  username: string;
  email: string;

  // Range aggregates
  totalTodos: number;
  completed: number;
  incomplete: number;
  pending: number;
  completionRate: number;

  // Optional "latest" task snapshot (for quick scanning)
  lastTodoStatus?: TodoStatus;
  lastTodoTitle?: string | null;
  lastUpdatedAt?: string | null;

  todos: TodoItem[];
};

type TeamTodoBlock = {
  leadId: string;
  leadUsername: string;
  leadEmail: string;
  membersCount: number;

  // team-level range aggregates
  teamTotalTodos: number;
  teamCompleted: number;
  teamIncomplete: number;
  teamPending: number;
  teamCompletionRate: number;

  members: MemberTodo[];
};

type ApiResponse = {
  teams: TeamTodoBlock[];
  totalTeams?: number;
  overall?: {
    total: number;
    completed: number;
    incomplete: number;
    pending: number;
    completionRate: number;
  };
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function fmtDateTime(d: string | null | undefined) {
  if (!d) return "-";
  const dt = new Date(d);
  return dt.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(s: TodoStatus) {
  if (s === "COMPLETE") return "Complete";
  if (s === "INCOMPLETE") return "Incomplete";
  return "Status";
}

function StatusPill({ status }: { status: TodoStatus | undefined }) {
  const s = status ?? "STATUS";
  const klass =
    s === "COMPLETE"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : s === "INCOMPLETE"
        ? "bg-rose-50 text-rose-800 border-rose-200"
        : "bg-amber-50 text-amber-900 border-amber-200";

  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", klass)}>
      <span className="h-2 w-2 rounded-full bg-current opacity-40" />
      {statusLabel(s)}
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const p = clamp(pct, 0, 100);
  return (
    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className="h-2 rounded-full bg-slate-900" style={{ width: `${p}%` }} />
    </div>
  );
}

function SummaryChip({ label, value, tone }: { label: string; value: string; tone?: "slate" | "emerald" | "rose" | "amber" }) {
  const cls =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "rose"
        ? "border-rose-200 bg-rose-50 text-rose-900"
        : tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-slate-200 bg-white text-slate-800";

  return (
    <span className={cn("text-xs font-semibold rounded-full border px-2.5 py-1", cls)}>
      {label}: {value}
    </span>
  );
}

function TeamCard({
  team,
  expanded,
  onToggle,
}: {
  team: TeamTodoBlock;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm overflow-hidden">
      {/* Team header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-5 py-4 border-b border-slate-200 hover:bg-slate-50/60 transition"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-sm font-semibold text-slate-900 truncate">
                Team Lead: {team.leadUsername}
              </div>
              <span className="text-xs text-slate-500 truncate">{team.leadEmail}</span>
              <span className="text-xs font-semibold rounded-full border border-slate-200 bg-white px-2.5 py-1">
                {team.membersCount} members
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <SummaryChip label="Todos" value={String(team.teamTotalTodos)} />
              <SummaryChip label="Complete" value={String(team.teamCompleted)} tone="emerald" />
              <SummaryChip label="Incomplete" value={String(team.teamIncomplete)} tone="rose" />
              <SummaryChip label="Status" value={String(team.teamPending)} tone="amber" />
              <SummaryChip label="Rate" value={`${team.teamCompletionRate}%`} />
            </div>

            <div className="mt-3 max-w-xs">
              <ProgressBar pct={team.teamCompletionRate} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{expanded ? "Hide" : "Show"} members</span>
            <span
              className={cn(
                "h-9 w-9 grid place-items-center rounded-2xl border border-slate-200 bg-white shadow-sm transition-transform",
                expanded ? "rotate-180" : "rotate-0"
              )}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M5 8l5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </div>
      </button>

      {/* Members schedule-like rows */}
      {expanded && (
        <div className="p-2">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="grid grid-cols-12 gap-0 px-4 py-3 border-b border-slate-200 bg-slate-50/60">
              <div className="col-span-4 text-xs font-semibold text-slate-700">Member</div>
              <div className="col-span-3 text-xs font-semibold text-slate-700">Latest</div>
              <div className="col-span-2 text-xs font-semibold text-slate-700">Rate</div>
              <div className="col-span-3 text-xs font-semibold text-slate-700 text-right">Range totals</div>
            </div>

            {team.members.length === 0 ? (
              <div className="px-4 py-8 text-sm text-slate-600 text-center">No members</div>
            ) : (
              team.members.map((m) => (
                <MemberRow key={m.userId} member={m} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberRow({ member }: { member: MemberTodo }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full grid grid-cols-12 gap-0 px-4 py-3 hover:bg-slate-50/50 text-left"
      >
        <div className="col-span-4 min-w-0">
          <div className="text-sm font-semibold text-slate-900 truncate">{member.username}</div>
          <div className="text-xs text-slate-500 truncate">{member.email}</div>
        </div>

        <div className="col-span-3 flex items-center gap-2 min-w-0">
          <StatusPill status={member.lastTodoStatus ?? "STATUS"} />
          <span className="text-xs text-slate-600 truncate">
            {member.lastTodoTitle ? member.lastTodoTitle : "—"}
          </span>
        </div>

        <div className="col-span-2 flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-900">{member.completionRate}%</span>
          <div className="flex-1">
            <ProgressBar pct={member.completionRate} />
          </div>
        </div>

        <div className="col-span-3 flex items-center justify-end gap-2 flex-wrap">
          <span className="text-xs rounded-full border border-slate-200 bg-white px-2.5 py-1">
            {member.totalTodos} todos
          </span>
          <span className="text-xs rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-900">
            C {member.completed}
          </span>
          <span className="text-xs rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-900">
            I {member.incomplete}
          </span>
          <span className="text-xs rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-900">
            S {member.pending}
          </span>

          <span className="ml-2 text-xs text-slate-500">
            {open ? "Hide" : "Show"} todos
          </span>
          <span className={cn("h-9 w-9 grid place-items-center rounded-2xl border border-slate-200 bg-white shadow-sm transition-transform", open ? "rotate-180" : "rotate-0")}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 8l5 5 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
              <div className="text-xs font-semibold text-slate-700">Todos</div>
              <div className="text-xs text-slate-500">
                Latest update: {fmtDateTime(member.lastUpdatedAt)}
              </div>
            </div>

            {member.todos.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-600">No todos in this range.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {member.todos.map((t) => (
                  <div key={t.id} className="px-4 py-3 hover:bg-slate-50/40">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-semibold text-slate-900">{t.title}</div>
                          <StatusPill status={t.status} />
                          <span className="text-xs rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-700">
                            {t.day}
                          </span>
                        </div>
                        {t.note ? <div className="mt-1 text-sm text-slate-600">{t.note}</div> : null}
                        <div className="mt-2 text-xs text-slate-500">
                          Created: {fmtDateTime(t.createdAt)} • Updated: {fmtDateTime(t.updatedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminTasks() {
  const today = useMemo(() => toISO(new Date()), []);
  const monthStart = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    return toISO(d);
  }, []);

  // Filters
  const [fromDay, setFromDay] = useState<string>(monthStart);
  const [toDay, setToDay] = useState<string>(today);
  const [status, setStatus] = useState<"all" | "complete" | "incomplete" | "status">("all");
  const [q, setQ] = useState<string>("");

  // Pagination (teams/leads)
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

  // Data
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<TeamTodoBlock[]>([]);
  const [totalTeams, setTotalTeams] = useState<number>(0);
  const [overall, setOverall] = useState<ApiResponse["overall"]>({
    total: 0,
    completed: 0,
    incomplete: 0,
    pending: 0,
    completionRate: 0,
  });
  const [err, setErr] = useState<string | null>(null);

  // Expand/collapse (leadId -> boolean)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const totalPages = Math.max(1, Math.ceil((totalTeams || 0) / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  async function loadAdminTeams(next?: Partial<{
    fromDay: string;
    toDay: string;
    status: "all" | "complete" | "incomplete" | "status";
    q: string;
    page: number;
    pageSize: number;
  }>) {
    setErr(null);
    setLoading(true);

    const effective = {
      fromDay,
      toDay,
      status,
      q,
      page,
      pageSize,
      ...next,
    };

    try {
      // normalize range ordering
      const f = effective.fromDay <= effective.toDay ? effective.fromDay : effective.toDay;
      const t = effective.fromDay <= effective.toDay ? effective.toDay : effective.fromDay;

      const qs = new URLSearchParams({
        from: f,
        to: t,
        status: effective.status,
        q: effective.q.trim(),
        page: String(effective.page),
        pageSize: String(effective.pageSize),
      });

      const data = await fetchJson<ApiResponse>(`/api/admin/todos/teams?${qs.toString()}`);
      const nextTeams = Array.isArray(data.teams) ? data.teams : [];

      setTeams(nextTeams);
      setTotalTeams(typeof data.totalTeams === "number" ? data.totalTeams : nextTeams.length);

      if (data.overall) {
        setOverall(data.overall);
      } else {
        // fallback compute from visible
        const allTodos = nextTeams.flatMap((tb) => tb.members.flatMap((m) => m.todos));
        const total = allTodos.length;
        const completed = allTodos.filter((x) => x.status === "COMPLETE").length;
        const incomplete = allTodos.filter((x) => x.status === "INCOMPLETE").length;
        const pending = allTodos.filter((x) => x.status === "STATUS").length;
        const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
        setOverall({ total, completed, incomplete, pending, completionRate });
      }

      // keep expanded state for existing ids, default collapsed for new ones
      setExpanded((prev) => {
        const copy: Record<string, boolean> = { ...prev };
        for (const tt of nextTeams) if (!(tt.leadId in copy)) copy[tt.leadId] = false;
        return copy;
      });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load admin tasks");
      setTeams([]);
      setTotalTeams(0);
      setOverall({ total: 0, completed: 0, incomplete: 0, pending: 0, completionRate: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminTeams({ fromDay: monthStart, toDay: today, page: 1, pageSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters() {
    setPage(1);
    loadAdminTeams({ page: 1 });
  }

  function resetFilters() {
    setFromDay(monthStart);
    setToDay(today);
    setStatus("all");
    setQ("");
    setPage(1);
    setPageSize(6);
    loadAdminTeams({ fromDay: monthStart, toDay: today, status: "all", q: "", page: 1, pageSize: 6 });
  }

  function jumpPage(p: number) {
    const next = Math.max(1, Math.min(totalPages, p));
    setPage(next);
    loadAdminTeams({ page: next });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Header / Filters card */}
        <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tasks</h1>
              <p className="text-sm text-slate-600">
                Team-wise todos across all Team Leads and Members.
              </p>
              <p className="text-xs text-slate-500">
                Range: {fromDay} → {toDay} • Status:{" "}
                {status === "all" ? "All" : status === "complete" ? "Complete" : status === "incomplete" ? "Incomplete" : "Status"}
                {q.trim() ? ` • Search: “${q.trim()}”` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadAdminTeams()}
                disabled={loading}
                className="h-10 rounded-2xl px-4 text-sm font-semibold shadow-sm border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60"
              >
                Refresh
              </button>
              <button
                onClick={resetFilters}
                disabled={loading}
                className="h-10 rounded-2xl px-4 text-sm font-semibold shadow-sm border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Overall stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm p-5 md:col-span-2">
              <div className="text-xs font-medium text-slate-500">Overall completion rate</div>
              <div className="mt-1 flex items-end justify-between gap-3">
                <div className="text-2xl font-semibold text-slate-900">{overall?.completionRate ?? 0}%</div>
                <div className="text-xs text-slate-500">all teams (visible filters)</div>
              </div>
              <div className="mt-3">
                <ProgressBar pct={overall?.completionRate ?? 0} />
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <SummaryChip label="Todos" value={String(overall?.total ?? 0)} />
                <SummaryChip label="Complete" value={String(overall?.completed ?? 0)} tone="emerald" />
                <SummaryChip label="Incomplete" value={String(overall?.incomplete ?? 0)} tone="rose" />
                <SummaryChip label="Status" value={String(overall?.pending ?? 0)} tone="amber" />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm p-5">
              <div className="text-xs font-medium text-slate-500">Total Todos</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{overall?.total ?? 0}</div>
              <div className="mt-1 text-xs text-slate-500">Across all teams</div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm p-5">
              <div className="text-xs font-medium text-slate-500">Completed</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{overall?.completed ?? 0}</div>
              <div className="mt-1 text-xs text-slate-500">Across all teams</div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm p-5">
              <div className="text-xs font-medium text-slate-500">Incomplete</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{overall?.incomplete ?? 0}</div>
              <div className="mt-1 text-xs text-slate-500">Across all teams</div>
            </div>
          </div>

          {/* Filters row */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
              <input
                type="date"
                value={fromDay}
                onChange={(e) => setFromDay(e.target.value)}
                className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
              <input
                type="date"
                value={toDay}
                onChange={(e) => setToDay(e.target.value)}
                className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as "all" | "complete" | "incomplete" | "status");
                  setPage(1);
                }}
                className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="all">All</option>
                <option value="complete">Complete</option>
                <option value="incomplete">Incomplete</option>
                <option value="status">Status</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search lead / member / task..."
                className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Teams</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  const ps = Number(e.target.value);
                  setPageSize(ps);
                  setPage(1);
                  loadAdminTeams({ pageSize: ps, page: 1 });
                }}
                className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              >
                {[4, 6, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-12 flex items-center justify-end gap-2">
              <button
                onClick={applyFilters}
                disabled={loading}
                className="h-11 rounded-2xl px-5 text-sm font-semibold shadow-sm border border-slate-200 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {err && (
          <div className="rounded-3xl border border-red-200 bg-red-50/80 backdrop-blur p-4 shadow-sm">
            <div className="text-sm text-slate-900">
              <span className="font-medium">Error:</span> {err}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-slate-600">
              {loading ? "Loading..." : `Showing ${teams.length} team(s) of ${totalTeams || teams.length}`}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setExpanded((prev) => {
                    const copy = { ...prev };
                    for (const t of teams) copy[t.leadId] = true;
                    return copy;
                  });
                }}
                className="h-10 rounded-2xl px-4 text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50"
              >
                Expand all
              </button>
              <button
                onClick={() => {
                  setExpanded((prev) => {
                    const copy = { ...prev };
                    for (const t of teams) copy[t.leadId] = false;
                    return copy;
                  });
                }}
                className="h-10 rounded-2xl px-4 text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50"
              >
                Collapse all
              </button>
            </div>
          </div>

          {teams.length === 0 && !loading && !err ? (
            <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur p-10 shadow-sm text-center">
              <div className="text-base font-semibold text-slate-900">No data</div>
              <div className="mt-1 text-sm text-slate-600">Try changing date range or filters.</div>
            </div>
          ) : (
            <div className="space-y-4">
              {teams.map((t) => (
                <TeamCard
                  key={t.leadId}
                  team={t}
                  expanded={!!expanded[t.leadId]}
                  onToggle={() => setExpanded((prev) => ({ ...prev, [t.leadId]: !prev[t.leadId] }))}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination (Teams/Leads) */}
        <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-slate-600">
            Page <span className="font-semibold text-slate-900">{page}</span> of{" "}
            <span className="font-semibold text-slate-900">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => jumpPage(1)}
              disabled={loading || !canPrev}
              className="h-10 rounded-2xl px-3 text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              First
            </button>
            <button
              onClick={() => jumpPage(page - 1)}
              disabled={loading || !canPrev}
              className="h-10 rounded-2xl px-3 text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              Prev
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Go to</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={page}
                onChange={(e) => setPage(Number(e.target.value || 1))}
                onBlur={() => jumpPage(page)}
                className="w-20 h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <button
              onClick={() => jumpPage(page + 1)}
              disabled={loading || !canNext}
              className="h-10 rounded-2xl px-3 text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
            <button
              onClick={() => jumpPage(totalPages)}
              disabled={loading || !canNext}
              className="h-10 rounded-2xl px-3 text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              Last
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
