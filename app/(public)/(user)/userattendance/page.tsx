// File: FileFactory/app/attendance/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import MonthlyHoursGraph, { type HoursPoint } from "@/components/ui/User/MonthlyHoursGraph";
import MonthlyReportTable, { type AttendanceRow } from "@/components/ui/User/MonthlyReportTable";

function minutesToHM(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}
function fmtTime(d: string | null) {
  if (!d) return "-";
  const date = new Date(d);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// Safe JSON fetch (prevents "Unexpected token <" when API returns HTML/404)
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
    const errorMessage =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed (status ${res.status})`;
    throw new Error(errorMessage);
  }

  return data as T;
}

export default function AttendancePage() {
  const todayISO = useMemo(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }, []);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [series, setSeries] = useState<HoursPoint[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const monthLabel = useMemo(() => {
    return new Date(year, month - 1, 1).toLocaleString([], { month: "long", year: "numeric" });
  }, [year, month]);

  async function loadMonth() {
    setErr(null);
    setLoading(true);

    try {
      const qs = new URLSearchParams({
        year: String(year),
        month: String(month),
      });

      const [list, graph] = await Promise.all([
        fetchJson<{ rows: AttendanceRow[] }>(`/api/attendance/list?${qs.toString()}`),
        fetchJson<{ series: HoursPoint[] }>(`/api/attendance/graph?${qs.toString()}`),
      ]);

      setRows(list.rows ?? []);
      setSeries(graph.series ?? []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load data");
      setRows([]);
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const todayRow = useMemo(() => {
    const match = rows.find((r) => r.day.slice(0, 10) === todayISO);
    return match ?? null;
  }, [rows, todayISO]);

  async function checkIn() {
    setErr(null);
    setLoading(true);
    try {
      await fetchJson<{ ok: boolean }>(`/api/attendance/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: todayISO }),
      });
      await loadMonth();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Check-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function checkOut() {
    setErr(null);
    setLoading(true);
    try {
      await fetchJson<{ ok: boolean }>(`/api/attendance/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: todayISO }),
      });
      await loadMonth();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Check-out failed");
    } finally {
      setLoading(false);
    }
  }

  const totalMonthMinutes = useMemo(() => {
    return rows.reduce((acc, r) => acc + (r.checkOutAt ? r.workMinutes : 0), 0);
  }, [rows]);

  const totalMonthHours = useMemo(() => {
    const h = Math.floor(totalMonthMinutes / 60);
    const m = totalMonthMinutes % 60;
    return `${h}h ${m}m`;
  }, [totalMonthMinutes]);

  const progressPct = useMemo(() => {
    // target: 200h/month (same as your earlier logic)
    return Math.min(100, (totalMonthMinutes / (200 * 60)) * 100);
  }, [totalMonthMinutes]);

  const todayPretty = useMemo(() => {
    return new Date().toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "2-digit",
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-100 via-sky-100 to-indigo-100 opacity-80" />
              <Image
                src="/filemarketai_logo.png"
                alt="FileMarket AI"
                width={34}
                height={34}
                priority
                className="relative"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Attendance
                </h1>

                <span className="hidden sm:inline-flex items-center rounded-full border border-slate-200 bg-white/80 backdrop-blur px-2.5 py-1 text-xs text-slate-700 shadow-sm">
                  {monthLabel}
                </span>

                {loading && (
                  <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 backdrop-blur px-2.5 py-1 text-xs text-slate-700 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-gradient-to-r from-emerald-400 to-sky-500 animate-pulse" />
                    Loading
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-600">
                Track check-ins, working hours, and monthly progress at a glance.
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap text-black">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-emerald-400 to-sky-500 opacity-90" />
              <select
                className="h-10 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur px-3 pl-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-emerald-300"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i + 1}>
                    {new Date(2020, i, 1).toLocaleString([], { month: "long" })}
                  </option>
                ))}
              </select>
            </div>

            <select
              className="h-10 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-sky-200"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {Array.from({ length: 5 }).map((_, i) => {
                const y = new Date().getFullYear() - 2 + i;
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>

            <button
              onClick={loadMonth}
              disabled={loading}
              className={cn(
                "h-10 rounded-2xl px-4 text-sm font-semibold shadow-sm border border-slate-200",
                "bg-white/90 backdrop-blur hover:bg-white",
                "disabled:opacity-60"
              )}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Error */}
        {err && (
          <div className="rounded-2xl border border-red-200 bg-red-50/80 backdrop-blur p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
              <div className="text-sm text-slate-900">
                <span className="font-medium">Error:</span> {err}
              </div>
            </div>
          </div>
        )}

        {/* Top stats + Today */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Month summary */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-sky-50" />

            <div className="relative p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-600">Month total</div>
                  <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                    {rows.length === 0 && !loading ? "0h 0m" : totalMonthHours}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur px-3 py-2 text-xs text-slate-700 shadow-sm">
                  Target: 200h
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Progress</span>
                  <span className="font-semibold text-slate-900">{Math.round(progressPct)}%</span>
                </div>
                <div className="mt-2 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 text-xs text-slate-500">
                Aggregated from completed days only.
              </div>
            </div>
          </div>

          {/* Today card */}
          <div className="relative overflow-hidden lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-emerald-50" />

            <div className="relative p-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-sm text-slate-600">Today</div>
                  <div className="text-lg font-semibold text-slate-900">{todayPretty}</div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-3 shadow-sm">
                      <div className="text-xs text-slate-500">Check-in</div>
                      <div className="mt-1 font-medium text-slate-900">
                        {fmtTime(todayRow?.checkInAt ?? null)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-3 shadow-sm">
                      <div className="text-xs text-slate-500">Check-out</div>
                      <div className="mt-1 font-medium text-slate-900">
                        {fmtTime(todayRow?.checkOutAt ?? null)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-3 shadow-sm">
                      <div className="text-xs text-slate-500">Total</div>
                      <div className="mt-1 font-medium text-slate-900">
                        {todayRow?.checkOutAt ? minutesToHM(todayRow.workMinutes) : "-"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {!todayRow && (
                    <button
                      disabled={loading}
                      onClick={checkIn}
                      className={cn(
                        "h-10 px-5 rounded-2xl text-sm font-semibold shadow-sm disabled:opacity-60",
                        "text-white bg-gradient-to-r from-emerald-500 to-sky-600",
                        "hover:brightness-[1.02] active:brightness-[0.98]"
                      )}
                    >
                      Check In
                    </button>
                  )}

                  {todayRow && !todayRow.checkOutAt && (
                    <button
                      disabled={loading}
                      onClick={checkOut}
                      className={cn(
                        "h-10 px-5 rounded-2xl text-sm font-semibold shadow-sm disabled:opacity-60",
                        "text-white bg-gradient-to-r from-sky-600 to-emerald-500",
                        "hover:brightness-[1.02] active:brightness-[0.98]"
                      )}
                    >
                      Check Out
                    </button>
                  )}

                  {todayRow && todayRow.checkOutAt && (
                    <button
                      disabled
                      className="h-10 px-5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur text-sm font-semibold text-slate-500"
                    >
                      Completed
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Graph */}
        <MonthlyHoursGraph series={series} loading={loading} />

        {/* Table */}
        <MonthlyReportTable rows={rows} loading={loading} />
      </div>
    </div>
  );
}
