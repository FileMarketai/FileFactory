// File: FileFactory/app/leadstodo/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

// Safe JSON fetch (same style as your Attendance page)
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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function startOfMonthISO(year: number, month1: number) {
  return `${year}-${pad2(month1)}-01`;
}
function endOfMonthISO(year: number, month1: number) {
  const d = new Date(year, month1, 0);
  return toISODate(d);
}
function todayISO() {
  return toISODate(new Date());
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function clampDateISO(valueISO: string, minISO: string, maxISO: string) {
  const v = valueISO;
  if (v < minISO) return minISO;
  if (v > maxISO) return maxISO;
  return v;
}

type TodoStatus = "STATUS" | "INCOMPLETE" | "COMPLETE";

type MemberTodo = {
  id: string;
  title: string;
  note: string | null;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
};

type MemberRow = {
  user: {
    id: string;
    username: string;
    email: string;
    isActive: boolean;
  };
  todos: MemberTodo[];
  stats: {
    total: number;
    completed: number;
    incomplete: number;
    pending: number;
    completionRate: number;
  };
};

type ApiResponse = {
  rows: MemberRow[];
  total?: number;
  overall: {
    total: number;
    completed: number;
    incomplete: number;
    pending: number;
    completionRate: number;
  };
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function statusLabel(s: TodoStatus) {
  if (s === "COMPLETE") return "Complete";
  if (s === "INCOMPLETE") return "Incomplete";
  return "Status";
}

function fmtDateTime(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusPill({ status }: { status: TodoStatus }) {
  const cls =
    status === "COMPLETE"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "INCOMPLETE"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${cls}`}>
      {statusLabel(status)}
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const p = clamp(pct, 0, 100);
  return (
    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
      <div
        className="h-2 rounded-full bg-slate-900"
        style={{ width: `${p}%` }}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm p-5">
      <div className="text-xs font-medium text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
    </div>
  );
}

export default function LeadsTodo() {
  const now = useMemo(() => new Date(), []);
  const initialYear = now.getFullYear();
  const initialMonth = now.getMonth() + 1;

  const [filtersOpen, setFiltersOpen] = useState<boolean>(true);

  const [year, setYear] = useState<number>(initialYear);
  const [month, setMonth] = useState<number>(initialMonth);

  const [fromDay, setFromDay] = useState<string>(startOfMonthISO(initialYear, initialMonth));
  const [toDay, setToDay] = useState<string>(todayISO());

  const [status, setStatus] = useState<"all" | "complete" | "incomplete" | "status">("all");
  const [q, setQ] = useState<string>("");

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [overall, setOverall] = useState<ApiResponse["overall"]>({
    total: 0,
    completed: 0,
    incomplete: 0,
    pending: 0,
    completionRate: 0,
  });

  const [err, setErr] = useState<string | null>(null);

  const monthMin = useMemo(() => startOfMonthISO(year, month), [year, month]);
  const monthMax = useMemo(() => endOfMonthISO(year, month), [year, month]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  async function loadTodos(next?: Partial<{
    year: number;
    month: number;
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
      year,
      month,
      fromDay,
      toDay,
      status,
      q,
      page,
      pageSize,
      ...next,
    };

    try {
      const qs = new URLSearchParams({
        year: String(effective.year),
        month: String(effective.month),
        from: effective.fromDay,
        to: effective.toDay,
        status: effective.status,
        q: effective.q.trim(),
        page: String(effective.page),
        pageSize: String(effective.pageSize),
      });

      const data = await fetchJson<ApiResponse>(`/api/teams/todos?${qs.toString()}`);

      setRows(Array.isArray(data.rows) ? data.rows : []);
      setTotal(typeof data.total === "number" ? data.total : (Array.isArray(data.rows) ? data.rows.length : 0));

      if (data.overall) {
        setOverall(data.overall);
      } else {
        // fallback compute if API didn't include overall
        const allTodos = (Array.isArray(data.rows) ? data.rows : []).flatMap((r) => r.todos);
        const totalT = allTodos.length;
        const completedT = allTodos.filter((t) => t.status === "COMPLETE").length;
        const incompleteT = allTodos.filter((t) => t.status === "INCOMPLETE").length;
        const pendingT = allTodos.filter((t) => t.status === "STATUS").length;
        const completionRate = totalT === 0 ? 0 : Math.round((completedT / totalT) * 100);
        setOverall({ total: totalT, completed: completedT, incomplete: incompleteT, pending: pendingT, completionRate });
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load todos");
      setRows([]);
      setTotal(0);
      setOverall({ total: 0, completed: 0, incomplete: 0, pending: 0, completionRate: 0 });
    } finally {
      setLoading(false);
    }
  }

  // keep from/to in the month when year/month changes
  useEffect(() => {
    const newFrom = startOfMonthISO(year, month);
    const newTo = clampDateISO(todayISO(), newFrom, endOfMonthISO(year, month));
    setFromDay(newFrom);
    setToDay(newTo);
    setPage(1);

    loadTodos({
      year,
      month,
      fromDay: newFrom,
      toDay: newTo,
      page: 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  // initial load
  useEffect(() => {
    loadTodos({
      year: initialYear,
      month: initialMonth,
      fromDay: startOfMonthISO(initialYear, initialMonth),
      toDay: todayISO(),
      page: 1,
      pageSize: 10,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadTodos({ q: q.trim(), page: 1 });
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Auto-apply when status changes
  useEffect(() => {
    setPage(1);
    loadTodos({ status, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function onApplyFilters() {
    const normalizedFrom = clampDateISO(fromDay, monthMin, monthMax);
    const normalizedTo = clampDateISO(toDay, monthMin, monthMax);

    const finalFrom = normalizedFrom <= normalizedTo ? normalizedFrom : normalizedTo;
    const finalTo = normalizedFrom <= normalizedTo ? normalizedTo : normalizedFrom;

    setFromDay(finalFrom);
    setToDay(finalTo);
    setPage(1);

    loadTodos({ fromDay: finalFrom, toDay: finalTo, page: 1 });
  }

  function onResetFilters() {
    const resetYear = initialYear;
    const resetMonth = initialMonth;
    const resetFrom = startOfMonthISO(resetYear, resetMonth);
    const resetTo = todayISO();

    setYear(resetYear);
    setMonth(resetMonth);
    setFromDay(resetFrom);
    setToDay(resetTo);
    setStatus("all");
    setQ("");
    setPage(1);
    setPageSize(10);

    loadTodos({
      year: resetYear,
      month: resetMonth,
      fromDay: resetFrom,
      toDay: resetTo,
      status: "all",
      q: "",
      page: 1,
      pageSize: 10,
    });
  }

  function jumpPage(nextPage: number) {
    const p = clamp(nextPage, 1, totalPages);
    setPage(p);
    loadTodos({ page: p });
  }

  const headerSubtitle = useMemo(() => {
    const range = `${fromDay} → ${toDay}`;
    const st =
      status === "all"
        ? "All"
        : status === "complete"
          ? "Complete"
          : status === "incomplete"
            ? "Incomplete"
            : "Status";
    const search = q.trim() ? ` • Search: “${q.trim()}”` : "";
    return `Range: ${range} • Status: ${st}${search}`;
  }, [fromDay, toDay, status, q]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (status !== "all") count++;
    if (q.trim()) count++;
    if (fromDay !== startOfMonthISO(year, month) || toDay !== todayISO()) count++;
    return count;
  }, [status, q, fromDay, toDay, year, month]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Team Tasks
              </h1>
              <p className="text-sm text-slate-600">
                View your members and their todos across days.
              </p>
              <p className="text-xs text-slate-500">{headerSubtitle}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadTodos()}
                disabled={loading}
                className="h-10 rounded-2xl px-4 text-sm font-semibold shadow-sm border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60"
              >
                Refresh
              </button>
              <button
                onClick={onResetFilters}
                disabled={loading}
                className="h-10 rounded-2xl px-4 text-sm font-semibold shadow-sm border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Top stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
            <StatCard title="Total Todos" value={String(overall.total)} subtitle="Across all members (filtered range)" />
            <StatCard title="Complete" value={String(overall.completed)} subtitle="Across all members" />
            <StatCard title="Incomplete" value={String(overall.incomplete)} subtitle="Across all members" />
            <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm p-5">
              <div className="text-xs font-medium text-slate-500">Completion Rate</div>
              <div className="mt-1 flex items-end justify-between gap-3">
                <div className="text-2xl font-semibold text-slate-900">{overall.completionRate}%</div>
                <div className="text-xs text-slate-500">overall</div>
              </div>
              <div className="mt-3">
                <ProgressBar pct={overall.completionRate} />
              </div>
            </div>
          </div>

          {/* Filters Toggle */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              <svg
                className={`w-5 h-5 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-900 text-white">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Filters */}
          {filtersOpen && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Year */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value || initialYear))}
                  className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {/* Month */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    const m = i + 1;
                    return (
                      <option key={m} value={m}>
                        {MONTH_NAMES[i]}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* From */}
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
                <input
                  type="date"
                  min={monthMin}
                  max={monthMax}
                  value={fromDay}
                  onChange={(e) => setFromDay(e.target.value)}
                  className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {/* To */}
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
                <input
                  type="date"
                  min={monthMin}
                  max={monthMax}
                  value={toDay}
                  onChange={(e) => setToDay(e.target.value)}
                  className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {/* Status */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Todo Status</label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "all" | "complete" | "incomplete" | "status")
                  }
                  className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="all">All</option>
                  <option value="complete">Complete</option>
                  <option value="incomplete">Incomplete</option>
                  <option value="status">Status</option>
                </select>
              </div>

              {/* Search */}
              <div className="md:col-span-8">
                <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by username / email / task title..."
                  className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {/* Page size */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Rows</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const ps = Number(e.target.value);
                    setPageSize(ps);
                    setPage(1);
                    loadTodos({ pageSize: ps, page: 1 });
                  }}
                  className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                >
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="md:col-span-2 flex items-end gap-2">
                <button
                  onClick={onApplyFilters}
                  disabled={loading}
                  className="w-full h-11 rounded-2xl px-4 text-sm font-semibold shadow-sm border border-slate-200 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  Apply Dates
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {err && (
          <div className="rounded-3xl border border-red-200 bg-red-50/80 backdrop-blur p-4 shadow-sm">
            <div className="text-sm text-slate-900">
              <span className="font-medium">Error:</span> {err}
            </div>
          </div>
        )}

        {/* Lead -> Members List */}
        <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm font-semibold text-slate-900">Members</div>
            <div className="text-xs text-slate-500">
              {loading ? "Loading..." : `Showing ${rows.length} of ${total || rows.length}`}
            </div>
          </div>

          <div className="p-4 space-y-3">
            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <div className="text-sm text-slate-600">Loading...</div>
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
                <div className="text-base font-semibold text-slate-900">No data</div>
                <div className="mt-1 text-sm text-slate-600">
                  Try expanding the date range or changing filters.
                </div>
              </div>
            ) : (
              rows.map((r) => (
                <MemberCard key={r.user.id} row={r} />
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
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
    </div>
  );
}

function MemberCard({ row }: { row: MemberRow }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-start justify-between gap-4 text-left hover:bg-slate-50"
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-slate-900">{row.user.username}</div>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${
                row.user.isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {row.user.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="text-xs text-slate-500">{row.user.email}</div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
              Todos: {row.stats.total}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
              Complete: {row.stats.completed}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
              {row.stats.completionRate}%
            </span>
          </div>

          <div className="w-44">
            <ProgressBar pct={row.stats.completionRate} />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{open ? "Hide" : "View"} tasks</span>
            <svg
              className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-200 px-5 py-4">
          {row.todos.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-semibold text-slate-900">No tasks</div>
              <div className="mt-1 text-sm text-slate-600">No todos match the current filters.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {row.todos.map((t) => (
                <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-semibold text-slate-900">{t.title}</div>
                        <StatusPill status={t.status} />
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
      )}
    </div>
  );
}
