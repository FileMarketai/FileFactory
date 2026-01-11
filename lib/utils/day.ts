// lib/utils/day.ts
export function parseDayKey(dayKey: string) {
  // expects YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null;
  const [y, m, d] = dayKey.split("-").map(Number);
  // store at UTC midnight to avoid timezone mismatch
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export function todayDayKeyUTC() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
