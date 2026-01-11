// File: FileFactory/components/ui/User/MonthlyHoursGraph.tsx
"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export type HoursPoint = { date: string; hours: number };

// -------- helpers --------
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function niceDateLabel(input: string) {
  // supports "2026-01-10" or any ISO-ish string
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

function fmtHours(h: number) {
  // Show 1 decimal for small values, otherwise whole hours
  if (!Number.isFinite(h)) return "0";
  if (h < 10) return h.toFixed(1);
  return Math.round(h).toString();
}

function fmtHoursLong(h: number) {
  if (!Number.isFinite(h)) return "0h";
  // if fractional, keep 2 decimals
  const fixed = h < 10 ? h.toFixed(2) : h.toFixed(1);
  return `${fixed}h`;
}

function computeTrend(series: HoursPoint[]) {
  // simple trend: compare last 7 points sum vs previous 7 points sum (if possible)
  const n = series.length;
  if (n < 2) return { delta: 0, pct: 0 };
  const window = clamp(Math.floor(n / 2), 3, 7);

  const last = series.slice(-window).reduce((a, p) => a + (p.hours || 0), 0);
  const prev = series.slice(-(window * 2), -window).reduce((a, p) => a + (p.hours || 0), 0);

  const delta = last - prev;
  const pct = prev > 0 ? (delta / prev) * 100 : 0;

  return { delta, pct };
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value ?? 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 backdrop-blur px-3 py-2 shadow-lg">
      <div className="text-[11px] text-slate-500">{label ? niceDateLabel(label) : ""}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-900">{fmtHoursLong(v)}</div>
    </div>
  );
};

export default function MonthlyHoursGraph({
  series,
  loading,
}: {
  series: HoursPoint[];
  loading: boolean;
}) {
  const [rangeLabel, setRangeLabel] = useState<"This month" | "Last 30 days">("This month");

  const total = useMemo(() => series.reduce((a, p) => a + (p.hours || 0), 0), [series]);
  const trend = useMemo(() => computeTrend(series), [series]);

  const trendIsUp = trend.delta >= 0;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* soft "dashboard" backdrop inside the card */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-sky-50" />

      <div className="relative p-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-medium text-slate-600">Total Hours</div>

            <div className="mt-2 flex items-end gap-3 flex-wrap">
              <div className="text-3xl font-semibold tracking-tight text-slate-900">
                {loading && series.length === 0 ? "—" : fmtHours(total)}
              </div>

              <div
                className={`
                  text-sm font-medium
                  ${trendIsUp ? "text-emerald-600" : "text-rose-600"}
                `}
              >
                {series.length === 0 || loading
                  ? ""
                  : `${trendIsUp ? "+" : ""}${fmtHours(trend.delta)} (${trend.pct ? trend.pct.toFixed(1) : "0.0"}%)`}
                {series.length === 0 || loading ? "" : ` · ${rangeLabel}`}
              </div>
            </div>
          </div>

          {/* Range control (UI only) */}
          <div className="flex items-center gap-2">
            <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur px-3 py-2 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-emerald-400 to-sky-500" />
                <select
                  value={rangeLabel}
                  onChange={(e) => setRangeLabel(e.target.value as "This month" | "Last 30 days")}
                  className="bg-transparent text-sm font-medium text-slate-800 outline-none"
                >
                  <option>This month</option>
                  <option>Last 30 days</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              className="h-10 w-10 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur shadow-sm hover:bg-white"
              title="Expand"
              aria-label="Expand"
              onClick={() => {}}
            >
              <svg viewBox="0 0 24 24" className="mx-auto h-5 w-5 text-slate-700">
                <path
                  fill="currentColor"
                  d="M7 14H5v5h5v-2H7v-3Zm0-4h2V7h3V5H5v5Zm12 9h-5v-2h3v-3h2v5Zm-5-14V5h5v5h-2V7h-3Z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="mt-6 h-72">
          {series.length === 0 && !loading ? (
            <div className="h-full rounded-2xl border border-slate-200 bg-white/70 backdrop-blur flex items-center justify-center text-sm text-slate-600">
              No data to display.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="hoursFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.28} />
                    <stop offset="55%" stopColor="#38bdf8" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>

                  <linearGradient id="hoursStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="55%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="2 10" strokeOpacity={0.35} vertical={false} />

                <XAxis
                  dataKey="date"
                  tickFormatter={niceDateLabel}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  minTickGap={18}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  width={42}
                  tickFormatter={(v) => (v === 0 ? "0" : fmtHours(Number(v)))}
                />

                <Tooltip
                  cursor={{ stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "2 4" }}
                  content={<CustomTooltip />}
                />

                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="url(#hoursStroke)"
                  strokeWidth={2.5}
                  fill="url(#hoursFill)"
                  dot={false}
                  activeDot={{
                    r: 7,
                    strokeWidth: 3,
                    stroke: "#ffffff",
                    fill: "#34d399",
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
