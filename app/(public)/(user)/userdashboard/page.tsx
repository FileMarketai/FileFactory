"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import MonthlyHoursGraph, { type HoursPoint } from "@/components/ui/User/MonthlyHoursGraph";
import MonthlyReportTable, { type AttendanceRow } from "@/components/ui/User/MonthlyReportTable";

type User = {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  teamLead: {
    id: string;
    username: string;
    email: string;
    role: string;
    isActive: boolean;
  } | null;
};

type Todo = {
  id: string;
  title: string;
  status: string;
};

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

export default function UserDashboard() {
  const router = useRouter();
  const todayISO = useMemo(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }, []);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [todosLoading, setTodosLoading] = useState(false);
  
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [series, setSeries] = useState<HoursPoint[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/user/profile", { cache: "no-store" });
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const userData = await res.json();
        setUser(userData);
      } catch (e) {
        console.error("Failed to load user:", e);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  async function loadAttendance() {
    setErr(null);
    setAttendanceLoading(true);

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
      setErr(e instanceof Error ? e.message : "Failed to load attendance");
      setRows([]);
      setSeries([]);
    } finally {
      setAttendanceLoading(false);
    }
  }

  async function loadTodos() {
    setTodosLoading(true);
    try {
      const todayKey = todayISO;
      const res = await fetch(`/api/todos?day=${todayKey}`);
      if (res.ok) {
        const data = await res.json();
        setTodos((data.items || []).slice(0, 5)); // Get top 5
      }
    } catch (e) {
      console.error("Failed to load todos:", e);
    } finally {
      setTodosLoading(false);
    }
  }

  useEffect(() => {
    if (!loading) {
      loadAttendance();
      loadTodos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, loading]);

  const todayRow = useMemo(() => {
    const match = rows.find((r) => r.day.slice(0, 10) === todayISO);
    return match ?? null;
  }, [rows, todayISO]);

  const totalMonthMinutes = useMemo(() => {
    return rows.reduce((acc, r) => acc + (r.checkOutAt ? r.workMinutes : 0), 0);
  }, [rows]);

  const totalMonthHours = useMemo(() => {
    const h = Math.floor(totalMonthMinutes / 60);
    const m = totalMonthMinutes % 60;
    return `${h}h ${m}m`;
  }, [totalMonthMinutes]);

  const progressPct = useMemo(() => {
    return Math.min(100, (totalMonthMinutes / (200 * 60)) * 100);
  }, [totalMonthMinutes]);

  const todosStats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((t) => t.status === "COMPLETE").length;
    const incomplete = todos.filter((t) => t.status === "INCOMPLETE").length;
    return { total, completed, incomplete };
  }, [todos]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

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
                  Dashboard
                </h1>
                <span className="hidden sm:inline-flex items-center rounded-full border border-slate-200 bg-white/80 backdrop-blur px-2.5 py-1 text-xs text-slate-700 shadow-sm">
                  Welcome, {user.username}
                </span>
              </div>

              <p className="text-sm text-slate-600">
                Overview of your attendance, tasks, and account information.
              </p>
            </div>
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

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Attendance Hours */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-sky-50" />
            <div className="relative p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Month Hours</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {attendanceLoading ? "—" : totalMonthHours}
              </div>
              <div className="mt-2 text-xs text-slate-500">Target: 200h</div>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Today's Status */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-emerald-50" />
            <div className="relative p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Today</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {todayRow?.checkOutAt ? minutesToHM(todayRow.workMinutes) : todayRow ? "Working" : "Not Checked In"}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {fmtTime(todayRow?.checkInAt ?? null)} - {fmtTime(todayRow?.checkOutAt ?? null)}
              </div>
            </div>
          </div>

          {/* Tasks Today */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
            <div className="relative p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tasks Today</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {todosLoading ? "—" : todosStats.total}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {todosStats.completed} complete, {todosStats.incomplete} incomplete
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-pink-50" />
            <div className="relative p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Account</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {user.isActive ? "Active" : "Inactive"}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {user.teamLead ? `Lead: ${user.teamLead.username}` : "No team lead"}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Attendance Graph */}
          <div className="lg:col-span-2">
            <MonthlyHoursGraph series={series} loading={attendanceLoading} />
          </div>

          {/* Quick Links */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-white" />
            <div className="relative p-5">
              <div className="text-sm font-semibold text-slate-900 mb-4">Quick Links</div>
              <div className="space-y-2">
                <a
                  href="/userattendance"
                  className="block rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-3 text-sm font-medium text-slate-700 hover:bg-white shadow-sm transition-colors"
                >
                  📅 Attendance
                </a>
                <a
                  href="/usertasks"
                  className="block rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-3 text-sm font-medium text-slate-700 hover:bg-white shadow-sm transition-colors"
                >
                  ✅ Tasks
                </a>
                <a
                  href="/userprofile"
                  className="block rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-3 text-sm font-medium text-slate-700 hover:bg-white shadow-sm transition-colors"
                >
                  👤 Profile
                </a>
                <a
                  href="/usersetting"
                  className="block rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-3 text-sm font-medium text-slate-700 hover:bg-white shadow-sm transition-colors"
                >
                  ⚙️ Settings
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Tasks */}
        {todos.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-white" />
            <div className="relative p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-slate-900">Recent Tasks</div>
                <a
                  href="/usertasks"
                  className="text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  View all →
                </a>
              </div>
              <div className="space-y-2">
                {todos.map((todo) => (
                  <div
                    key={todo.id}
                    className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-900">{todo.title}</span>
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-medium",
                          todo.status === "COMPLETE"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                        )}
                      >
                        {todo.status === "COMPLETE" ? "Complete" : "Incomplete"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* User Info Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-sky-50" />
            <div className="relative p-5">
              <div className="text-sm font-semibold text-slate-900 mb-4">Your Details</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Username:</span>
                  <span className="font-medium text-slate-900">{user.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-900">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Role:</span>
                  <span className="font-medium text-slate-900">{user.role}</span>
                </div>
                <a
                  href="/userprofile"
                  className="block mt-4 text-center rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-2 text-xs font-medium text-slate-700 hover:bg-white shadow-sm"
                >
                  View Full Profile →
                </a>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-emerald-50" />
            <div className="relative p-5">
              <div className="text-sm font-semibold text-slate-900 mb-4">Team Lead</div>
              {user.teamLead ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Username:</span>
                    <span className="font-medium text-slate-900">{user.teamLead.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="font-medium text-slate-900">{user.teamLead.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium",
                        user.teamLead.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      )}
                    >
                      {user.teamLead.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">No team lead assigned</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
