// File: FileFactory/app/leadsdashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import TeamMembersTable, {
  type TeamMemberRow,
} from "@/components/ui/Leads/TeamMembersTable";

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
  // last day of month
  const d = new Date(year, month1, 0);
  return toISODate(d);
}
function todayISO() {
  return toISODate(new Date());
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type ApiResponse = {
  rows: TeamMemberRow[];
  total?: number; // total rows for pagination (recommended)
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function LeadsDashboard() {
  const now = useMemo(() => new Date(), []);
  const initialYear = now.getFullYear();
  const initialMonth = now.getMonth() + 1;

  // Filters visibility
  const [filtersOpen, setFiltersOpen] = useState<boolean>(true);

  // Filters
  const [year, setYear] = useState<number>(initialYear);
  const [month, setMonth] = useState<number>(initialMonth);

  // date range inside selected month
  const [fromDay, setFromDay] = useState<string>(startOfMonthISO(initialYear, initialMonth));
  const [toDay, setToDay] = useState<string>(todayISO());

  // extra filters (these are optional; your API can ignore until implemented)
  const [status, setStatus] = useState<"all" | "present" | "absent" | "checkedin">("all");
  const [q, setQ] = useState<string>(""); // search by name/email/username

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<TeamMemberRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);

  // keep from/to in the month when year/month changes
  useEffect(() => {
    const newFrom = startOfMonthISO(year, month);
    const newTo = clampDateISO(todayISO(), newFrom, endOfMonthISO(year, month));
    setFromDay(newFrom);
    setToDay(newTo);
    setPage(1);
    // Auto-apply when year/month changes
    loadTeam({
      year,
      month,
      fromDay: newFrom,
      toDay: newTo,
      page: 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  function clampDateISO(valueISO: string, minISO: string, maxISO: string) {
    const v = valueISO;
    if (v < minISO) return minISO;
    if (v > maxISO) return maxISO;
    return v;
  }

  const monthMin = useMemo(() => startOfMonthISO(year, month), [year, month]);
  const monthMax = useMemo(() => endOfMonthISO(year, month), [year, month]);

  const canPrev = page > 1;
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const canNext = page < totalPages;

  async function loadTeam(next?: Partial<{
    year: number;
    month: number;
    fromDay: string;
    toDay: string;
    status: "all" | "present" | "absent" | "checkedin";
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

        // range (so lead can view previous days)
        from: effective.fromDay,
        to: effective.toDay,

        // optional filters
        status: effective.status,
        q: effective.q.trim(),

        // pagination
        page: String(effective.page),
        pageSize: String(effective.pageSize),
      });

      const data = await fetchJson<ApiResponse>(`/api/teams/members?${qs.toString()}`);
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setTotal(typeof data.total === "number" ? data.total : (Array.isArray(data.rows) ? data.rows.length : 0));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load team");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  // initial load
  useEffect(() => {
    loadTeam({
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
      if (q.trim() || q === "") {
        setPage(1);
        loadTeam({ q: q.trim(), page: 1 });
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Auto-apply when status changes
  useEffect(() => {
    setPage(1);
    loadTeam({ status, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function onApplyFilters() {
    // normalize date range to month bounds
    const normalizedFrom = clampDateISO(fromDay, monthMin, monthMax);
    const normalizedTo = clampDateISO(toDay, monthMin, monthMax);

    // ensure from <= to
    const finalFrom = normalizedFrom <= normalizedTo ? normalizedFrom : normalizedTo;
    const finalTo = normalizedFrom <= normalizedTo ? normalizedTo : normalizedFrom;

    setFromDay(finalFrom);
    setToDay(finalTo);
    setPage(1);

    loadTeam({ fromDay: finalFrom, toDay: finalTo, page: 1 });
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

    loadTeam({
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
    loadTeam({ page: p });
  }

  const headerSubtitle = useMemo(() => {
    const range = `${fromDay} → ${toDay}`;
    const st =
      status === "all"
        ? "All"
        : status === "present"
          ? "Present"
          : status === "absent"
            ? "Absent"
            : "Checked-in";
    const search = q.trim() ? ` • Search: “${q.trim()}”` : "";
    return `Range: ${range} • Status: ${st}${search}`;
  }, [fromDay, toDay, status, q]);

  // Count active filters
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
                Attendance
              </h1>
              <p className="text-sm text-slate-600">
                View your members and track attendance across days.
              </p>
              <p className="text-xs text-slate-500">{headerSubtitle}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadTeam()}
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
                onChange={(e) => {
                  const v = Number(e.target.value || initialYear);
                  setYear(v);
                }}
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
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as "all" | "present" | "absent" | "checkedin");
                }}
                className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="all">All</option>
                <option value="present">Present</option>
                <option value="checkedin">Checked-in</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            {/* Search */}
            <div className="md:col-span-8">
              <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by username / name / email..."
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
                  loadTeam({ pageSize: ps, page: 1 });
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

        {/* Table */}
        <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm font-semibold text-slate-900">Members</div>
            <div className="text-xs text-slate-500">
              {loading ? "Loading..." : `Showing ${rows.length} of ${total || rows.length}`}
            </div>
          </div>

          <div className="p-2">
            <TeamMembersTable rows={rows} loading={loading} />
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

        {/* Empty state */}
        {!loading && !err && rows.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur p-10 shadow-sm text-center">
            <div className="text-base font-semibold text-slate-900">No data</div>
            <div className="mt-1 text-sm text-slate-600">
              Try expanding the date range or changing filters.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
