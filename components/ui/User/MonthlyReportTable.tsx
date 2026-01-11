// File: FileFactory/components/ui/User/MonthlyReportTable.tsx
"use client";

export type AttendanceRow = {
  id: string;
  day: string;
  checkInAt: string;
  checkOutAt: string | null;
  workMinutes: number;
  user: { id: string; username: string; email: string };
};

function fmtTime(d: string | null) {
  if (!d) return "-";
  const date = new Date(d);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDayISO(dayISO: string) {
  const d = new Date(dayISO);
  return d.toLocaleDateString([], { year: "numeric", month: "short", day: "2-digit" });
}

function minutesToHM(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function dayName(dayISO: string) {
  const d = new Date(dayISO);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString([], { weekday: "short" }); // Mon, Tue...
}

function statusFromRow(r: AttendanceRow) {
  if (!r.checkInAt) return { label: "Missing", tone: "slate" as const };
  if (r.checkInAt && !r.checkOutAt) return { label: "In progress", tone: "amber" as const };
  return { label: "Completed", tone: "emerald" as const };
}

function StatusPill({ tone, label }: { tone: "slate" | "amber" | "emerald"; label: string }) {
  const cls =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", cls)}>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-slate-400"
        )}
      />
      {label}
    </span>
  );
}

export default function MonthlyReportTable({
  rows,
  loading,
}: {
  rows: AttendanceRow[];
  loading: boolean;
}) {
  const completedCount = rows.filter((r) => !!r.checkOutAt).length;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* soft internal backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-50/50 via-white to-emerald-50/40" />

      {/* Header */}
      <div className="relative p-6 border-b border-slate-200">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-base font-semibold text-slate-900">Monthly report</div>
            <div className="text-sm text-slate-600">
              Check-in/out history for the selected month.
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur px-3 py-2 text-xs text-slate-700 shadow-sm">
              <span className="text-slate-500">Records:</span>{" "}
              <span className="font-semibold text-slate-900">{rows.length}</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur px-3 py-2 text-xs text-slate-700 shadow-sm">
              <span className="text-slate-500">Completed:</span>{" "}
              <span className="font-semibold text-slate-900">{completedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
            <tr>
              <th className="p-4 text-left font-semibold text-slate-900">Day</th>
              <th className="p-4 text-left font-semibold text-slate-900">Check In</th>
              <th className="p-4 text-left font-semibold text-slate-900">Check Out</th>
              <th className="p-4 text-left font-semibold text-slate-900">Total</th>
              <th className="p-4 text-left font-semibold text-slate-900">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td className="p-10 text-slate-600" colSpan={5}>
                  <div className="flex items-center gap-3">
                    {loading ? (
                      <>
                        <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-sky-500 animate-pulse" />
                        Loading...
                      </>
                    ) : (
                      "No records found."
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => {
                const status = statusFromRow(r);

                return (
                  <tr
                    key={r.id}
                    className={cn(
                      "group transition-colors",
                      idx % 2 === 0 ? "bg-white/60" : "bg-slate-50/60",
                      "hover:bg-sky-50/60"
                    )}
                  >
                    {/* Day */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur flex items-center justify-center text-xs font-semibold text-slate-700 shadow-sm">
                          {dayName(r.day)}
                        </div>
                        <div className="font-medium text-slate-900">{fmtDayISO(r.day)}</div>
                      </div>
                    </td>

                    {/* Check In */}
                    <td className="p-4 whitespace-nowrap text-slate-900">{fmtTime(r.checkInAt)}</td>

                    {/* Check Out */}
                    <td className="p-4 whitespace-nowrap text-slate-900">{fmtTime(r.checkOutAt)}</td>

                    {/* Total */}
                    <td className="p-4 whitespace-nowrap">
                      {r.checkOutAt ? (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 backdrop-blur px-2.5 py-1 text-xs font-semibold text-slate-900 shadow-sm">
                          {minutesToHM(r.workMinutes)}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-4 whitespace-nowrap">
                      <StatusPill tone={status.tone} label={status.label} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer hint */}
      <div className="relative border-t border-slate-200 px-6 py-4 text-xs text-slate-500 bg-white/60 backdrop-blur">
        Tip: “In progress” means you checked in but haven’t checked out yet.
      </div>
    </div>
  );
}
