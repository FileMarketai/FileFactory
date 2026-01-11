// File: FileFactory/components/ui/User/TeamMembersTable.tsx
"use client";

import { useMemo, useState } from "react";

export type TeamMemberRow = {
  id: string;
  username: string;
  email: string;
  role?: "USER" | "LEAD" | "ADMIN" | string;
  isActive?: boolean;
  createdAt?: string | Date | null;

  // Optional: useful if you already have them
  todayCheckInAt?: string | null;
  todayCheckOutAt?: string | null;
  todayWorkMinutes?: number | null;

  // Optional: monthly summary for the selected month
  monthMinutes?: number | null;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function fmtDate(d?: string | Date | null) {
  if (!d) return "-";
  const dd = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dd.getTime())) return "-";
  return dd.toLocaleDateString([], { year: "numeric", month: "short", day: "2-digit" });
}

function fmtTime(d?: string | null) {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function minutesToHM(m?: number | null) {
  if (!m || m <= 0) return "0h 0m";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}

function Pill({
  tone,
  label,
}: {
  tone: "emerald" | "amber" | "rose" | "slate" | "sky";
  label: string;
}) {
  const cls =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "rose"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : tone === "sky"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : "border-slate-200 bg-slate-50 text-slate-700";

  const dot =
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "amber"
      ? "bg-amber-500"
      : tone === "rose"
      ? "bg-rose-500"
      : tone === "sky"
      ? "bg-sky-500"
      : "bg-slate-400";

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}

function initials(username: string) {
  const p = username.trim().split(/[\s._-]+/).filter(Boolean);
  const a = (p[0]?.[0] ?? "U").toUpperCase();
  const b = (p[1]?.[0] ?? "").toUpperCase();
  return `${a}${b}`.slice(0, 2);
}

function presenceStatus(m: TeamMemberRow) {
  // basic logic (customize as you want)
  if (m.isActive === false) return { label: "Deactivated", tone: "rose" as const };
  if (m.todayCheckInAt && !m.todayCheckOutAt) return { label: "Checked in", tone: "amber" as const };
  if (m.todayCheckOutAt) return { label: "Completed", tone: "emerald" as const };
  return { label: "Not started", tone: "slate" as const };
}

export default function TeamMembersTable({
  title = "Team members",
  subtitle = "Overview of your team members and their attendance status.",
  rows,
  loading,
}: {
  title?: string;
  subtitle?: string;
  rows: TeamMemberRow[];
  loading: boolean;
}) {
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(true);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => (showInactive ? true : r.isActive !== false))
      .filter((r) => {
        if (!needle) return true;
        return (
          r.username.toLowerCase().includes(needle) ||
          r.email.toLowerCase().includes(needle) ||
          (r.role ?? "").toLowerCase().includes(needle)
        );
      });
  }, [rows, q, showInactive]);

  const activeCount = useMemo(() => rows.filter((r) => r.isActive !== false).length, [rows]);
  const checkedInNow = useMemo(
    () => rows.filter((r) => r.isActive !== false && r.todayCheckInAt && !r.todayCheckOutAt).length,
    [rows]
  );

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-50/40 via-white to-sky-50/35" />

      {/* Header */}
      <div className="relative p-6 border-b border-slate-200">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-base font-semibold text-slate-900">{title}</div>
            <div className="text-sm text-slate-600">{subtitle}</div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur px-3 py-2 text-xs text-slate-700 shadow-sm">
              <span className="text-slate-500">Total:</span>{" "}
              <span className="font-semibold text-slate-900">{rows.length}</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur px-3 py-2 text-xs text-slate-700 shadow-sm">
              <span className="text-slate-500">Active:</span>{" "}
              <span className="font-semibold text-slate-900">{activeCount}</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur px-3 py-2 text-xs text-slate-700 shadow-sm">
              <span className="text-slate-500">Checked in now:</span>{" "}
              <span className="font-semibold text-slate-900">{checkedInNow}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative w-full sm:w-96">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                <path
                  fill="currentColor"
                  d="M10 18a8 8 0 1 1 0-16a8 8 0 0 1 0 16Zm11 3l-6-6l1.5-1.5l6 6L21 21Z"
                />
              </svg>
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by username, email, role..."
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white/70 backdrop-blur pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>

          <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur px-3 py-2 text-sm text-slate-800 shadow-sm select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Show inactive
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
            <tr>
              <th className="p-4 text-left font-semibold text-slate-900">Member</th>
              <th className="p-4 text-left font-semibold text-slate-900">Email</th>
              <th className="p-4 text-left font-semibold text-slate-900">Role</th>
              <th className="p-4 text-left font-semibold text-slate-900">Today</th>
              <th className="p-4 text-left font-semibold text-slate-900">Monthly total</th>
              <th className="p-4 text-left font-semibold text-slate-900">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td className="p-10 text-slate-600" colSpan={6}>
                  <div className="flex items-center gap-3">
                    {loading ? (
                      <>
                        <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-sky-500 animate-pulse" />
                        Loading...
                      </>
                    ) : q.trim() ? (
                      "No members match your search."
                    ) : (
                      "No members found."
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((m, idx) => {
                const st = presenceStatus(m);
                const isInactive = m.isActive === false;

                return (
                  <tr
                    key={m.id}
                    className={cn(
                      "group transition-colors",
                      idx % 2 === 0 ? "bg-white/60" : "bg-slate-50/60",
                      "hover:bg-sky-50/60",
                      isInactive && "opacity-70"
                    )}
                  >
                    {/* Member */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur shadow-sm flex items-center justify-center font-semibold text-slate-700">
                          {initials(m.username)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{m.username}</div>
                          <div className="text-xs text-slate-500">Joined: {fmtDate(m.createdAt)}</div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="p-4 whitespace-nowrap text-slate-700">{m.email}</td>

                    {/* Role */}
                    <td className="p-4 whitespace-nowrap">
                      <Pill
                        tone={m.role === "LEAD" ? "sky" : m.role === "ADMIN" ? "emerald" : "slate"}
                        label={m.role ?? "USER"}
                      />
                    </td>

                    {/* Today */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="text-xs text-slate-500">In</div>
                          <div className="font-medium text-slate-900">{fmtTime(m.todayCheckInAt ?? null)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Out</div>
                          <div className="font-medium text-slate-900">{fmtTime(m.todayCheckOutAt ?? null)}</div>
                        </div>
                        <div className="hidden md:block">
                          <div className="text-xs text-slate-500">Total</div>
                          <div className="font-semibold text-slate-900">{minutesToHM(m.todayWorkMinutes ?? 0)}</div>
                        </div>
                      </div>
                    </td>

                    {/* Monthly total */}
                    <td className="p-4 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 backdrop-blur px-2.5 py-1 text-xs font-semibold text-slate-900 shadow-sm">
                        {minutesToHM(m.monthMinutes ?? 0)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-4 whitespace-nowrap">
                      {isInactive ? <Pill tone="rose" label="Deactivated" /> : <Pill tone={st.tone} label={st.label} />}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="relative border-t border-slate-200 px-6 py-4 text-xs text-slate-500 bg-white/60 backdrop-blur">
        Tip: Use the search to quickly find a team member. “Checked in” means they haven’t checked out yet.
      </div>
    </div>
  );
}
