"use client";

import React, { useMemo, useState, useEffect } from "react";

type TodoStatus = "Status" | "Incomplete" | "Complete";
type ApiTodoStatus = "STATUS" | "INCOMPLETE" | "COMPLETE";

type Todo = {
  id: string;
  title: string;
  note?: string;
  status: TodoStatus;
  createdAt: string; // ISO
  updatedAt?: string; // ISO
};

type ApiTodo = {
  id: string;
  title: string;
  note: string | null;
  status: ApiTodoStatus;
  createdAt: string;
  updatedAt: string | null;
};

// Status mapping functions
function apiStatusToUI(apiStatus: ApiTodoStatus): TodoStatus {
  if (apiStatus === "COMPLETE") return "Complete";
  if (apiStatus === "INCOMPLETE") return "Incomplete";
  return "Status";
}

function uiStatusToApi(uiStatus: TodoStatus): ApiTodoStatus {
  if (uiStatus === "Complete") return "COMPLETE";
  if (uiStatus === "Incomplete") return "INCOMPLETE";
  return "STATUS";
}

function apiTodoToUI(apiTodo: ApiTodo): Todo {
  return {
    id: apiTodo.id,
    title: apiTodo.title,
    note: apiTodo.note || undefined,
    status: apiStatusToUI(apiTodo.status),
    createdAt: apiTodo.createdAt,
    updatedAt: apiTodo.updatedAt || undefined,
  };
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}


function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { year: "numeric", month: "short", day: "2-digit" });
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

function toDayKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dayKeyToNice(dayKey: string) {
  const [y, m, d] = dayKey.split("-").map((x) => Number(x));
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString([], { weekday: "short", year: "numeric", month: "short", day: "2-digit" });
}

function StatusPill({ status }: { status: TodoStatus }) {
  const cls =
    status === "Complete"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "Incomplete"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", cls)}>{status}</span>;
}

function StatCard({
  label,
  value,
  sub,
  accent = "default",
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "default" | "brand";
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      {accent === "brand" ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500" />
      ) : null}

      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-900">{value}</p>
      <p className="mt-2 text-xs text-neutral-500">{sub}</p>
    </div>
  );
}

export default function Page() {
  const todayKey = useMemo(() => toDayKey(new Date()), []);
  const [selectedDay, setSelectedDay] = useState<string>(todayKey);

  // State: todos stored by day
  const [todosByDay, setTodosByDay] = useState<Record<string, Todo[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Fetch todos for a specific day
  async function fetchTodosForDay(dayKey: string) {
    if (loading[dayKey]) return;
    
    setLoading((prev) => ({ ...prev, [dayKey]: true }));
    setError(null);

    try {
      const res = await fetch(`/api/todos?day=${dayKey}`);
      if (!res.ok) {
        if (res.status === 401) {
          setError("Unauthorized. Please log in.");
          return;
        }
        const data = await res.json().catch(() => ({ error: "Failed to fetch todos" }));
        setError(data.error || "Failed to fetch todos");
        return;
      }

      const data = await res.json();
      const todos = (data.items || []).map(apiTodoToUI);
      setTodosByDay((prev) => ({ ...prev, [dayKey]: todos }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch todos");
    } finally {
      setLoading((prev) => ({ ...prev, [dayKey]: false }));
    }
  }

  // Fetch todos when selectedDay changes
  useEffect(() => {
    if (selectedDay && !todosByDay[selectedDay] && !loading[selectedDay]) {
      fetchTodosForDay(selectedDay);
    }
  }, [selectedDay]);

  // Fetch today's todos on mount
  useEffect(() => {
    if (todayKey && !todosByDay[todayKey] && !loading[todayKey]) {
      fetchTodosForDay(todayKey);
    }
  }, []);

  const availableDays = useMemo(() => {
    const days = Object.keys(todosByDay).filter((day) => todosByDay[day].length > 0);
    days.push(todayKey);
    return Array.from(new Set(days)).sort((a, b) => (a > b ? -1 : 1));
  }, [todosByDay, todayKey]);

  // Add / edit UI state
  const [newTitle, setNewTitle] = useState("");
  const [newNote, setNewNote] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");

  const todosForDay = todosByDay[selectedDay] ?? [];
  const isLoading = loading[selectedDay] ?? false;

  const statsForDay = useMemo(() => {
    const total = todosForDay.length;
    const completed = todosForDay.filter((t) => t.status === "Complete").length;
    const incomplete = todosForDay.filter((t) => t.status === "Incomplete").length;
    const pending = todosForDay.filter((t) => t.status === "Status").length;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, incomplete, pending, completionRate };
  }, [todosForDay]);

  const statsAllTime = useMemo(() => {
    const all = Object.values(todosByDay).flat();
    const total = all.length;
    const completed = all.filter((t) => t.status === "Complete").length;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, completionRate };
  }, [todosByDay]);

  function ensureDay(dayKey: string) {
    setTodosByDay((prev) => {
      if (prev[dayKey]) return prev;
      return { ...prev, [dayKey]: [] };
    });
  }

  function onPickDay(dayKey: string) {
    ensureDay(dayKey);
    setSelectedDay(dayKey);
    setEditingId(null);
    if (!todosByDay[dayKey] && !loading[dayKey]) {
      fetchTodosForDay(dayKey);
    }
  }

  async function addTodo() {
    const title = newTitle.trim();
    const note = newNote.trim();
    if (!title) return;

    setError(null);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: selectedDay, title, note: note || undefined }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError("Unauthorized. Please log in.");
          return;
        }
        const data = await res.json().catch(() => ({ error: "Failed to create todo" }));
        setError(data.error || "Failed to create todo");
        return;
      }

      const data = await res.json();
      const newTodo = apiTodoToUI(data.item);
      
      setTodosByDay((prev) => ({
        ...prev,
        [selectedDay]: [newTodo, ...(prev[selectedDay] ?? [])],
      }));

      setNewTitle("");
      setNewNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create todo");
    }
  }

  function startEdit(t: Todo) {
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditNote(t.note ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditNote("");
  }

  async function saveEdit(id: string) {
    const title = editTitle.trim();
    const note = editNote.trim();
    if (!title) return;

    setError(null);
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, note: note || null }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError("Unauthorized. Please log in.");
          return;
        }
        const data = await res.json().catch(() => ({ error: "Failed to update todo" }));
        setError(data.error || "Failed to update todo");
        return;
      }

      const data = await res.json();
      const updatedTodo = apiTodoToUI(data.item);

      setTodosByDay((prev) => ({
        ...prev,
        [selectedDay]: (prev[selectedDay] ?? []).map((t) => (t.id === id ? updatedTodo : t)),
      }));

      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update todo");
    }
  }

  async function setStatus(id: string, status: TodoStatus) {
    setError(null);
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: uiStatusToApi(status) }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError("Unauthorized. Please log in.");
          return;
        }
        const data = await res.json().catch(() => ({ error: "Failed to update status" }));
        setError(data.error || "Failed to update status");
        return;
      }

      const data = await res.json();
      const updatedTodo = apiTodoToUI(data.item);

      setTodosByDay((prev) => ({
        ...prev,
        [selectedDay]: (prev[selectedDay] ?? []).map((t) => (t.id === id ? updatedTodo : t)),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function removeTodo(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError("Unauthorized. Please log in.");
          return;
        }
        const data = await res.json().catch(() => ({ error: "Failed to delete todo" }));
        setError(data.error || "Failed to delete todo");
        return;
      }

      setTodosByDay((prev) => ({
        ...prev,
        [selectedDay]: (prev[selectedDay] ?? []).filter((t) => t.id !== id),
      }));
      
      if (editingId === id) cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete todo");
    }
  }

  // Date picker value expects YYYY-MM-DD
  const datePickerValue = selectedDay;

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        {/* Error message */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50/80 backdrop-blur p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
              <div className="flex-1 text-sm text-slate-900">
                <span className="font-medium">Error:</span> {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 font-semibold underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-100 via-sky-100 to-indigo-100 opacity-80" />
              <div className="relative h-5 w-5 rounded-lg bg-gradient-to-br from-emerald-400 via-sky-400 to-indigo-500" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Tasks
                </h1>
              </div>

              <p className="text-sm text-slate-600">
                Manage your daily tasks and track completion progress.
              </p>
            </div>
          </div>

          {/* Day selector (date picker + quick chips) */}
          <div className="flex items-center gap-2 flex-wrap text-black">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-emerald-400 to-sky-500 opacity-90" />
              <input
                type="date"
                value={datePickerValue}
                onChange={(e) => onPickDay(e.target.value)}
                className="h-10 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur px-3 pl-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {availableDays.slice(0, 4).map((dayKey) => (
                <button
                  key={dayKey}
                  onClick={() => onPickDay(dayKey)}
                  disabled={loading[dayKey]}
                  className={cn(
                    "h-10 rounded-2xl border px-3 text-xs font-medium shadow-sm",
                    dayKey === selectedDay
                      ? "border-transparent bg-gradient-to-r from-emerald-500 to-sky-600 text-white"
                      : "border-slate-200 bg-white/90 backdrop-blur text-slate-700 hover:bg-white",
                    loading[dayKey] && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {dayKey === todayKey ? "Today" : dayKeyToNice(dayKey)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Top dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <StatCard label="Tasks (Selected Day)" value={String(statsForDay.total)} sub={dayKeyToNice(selectedDay)} accent="brand" />
          <StatCard label="Complete" value={String(statsForDay.completed)} sub="Finished tasks" />
          <StatCard label="Incomplete" value={String(statsForDay.incomplete)} sub="Need attention" />
          <StatCard label="Completion Rate" value={`${statsForDay.completionRate}%`} sub="Selected day" />
        </div>

        {/* Progress + All-time mini */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-emerald-50" />
              <div className="relative p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Total rate of completion</p>
                    <p className="mt-1 text-xs text-slate-500">For {dayKeyToNice(selectedDay)}</p>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{statsForDay.completionRate}%</div>
                </div>

                <div className="mt-4 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500"
                    style={{ width: `${statsForDay.completionRate}%` }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-full border border-slate-200 bg-white/80 backdrop-blur px-2.5 py-1 shadow-sm">
                    Complete: <span className="font-semibold text-slate-900">{statsForDay.completed}</span>
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white/80 backdrop-blur px-2.5 py-1 shadow-sm">
                    Incomplete: <span className="font-semibold text-slate-900">{statsForDay.incomplete}</span>
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white/80 backdrop-blur px-2.5 py-1 shadow-sm">
                    Status: <span className="font-semibold text-slate-900">{statsForDay.pending}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-sky-50" />
              <div className="relative p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">All-time</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{statsAllTime.completionRate}%</p>
                <p className="mt-2 text-xs text-slate-500">
                  Completed {statsAllTime.completed} / {statsAllTime.total}
                </p>

                <div className="mt-4 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500"
                    style={{ width: `${statsAllTime.completionRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add Todo */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 bg-neutral-50 p-5">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold">Add task</p>
                <p className="mt-1 text-xs text-neutral-500">Task will be added to the selected date.</p>
              </div>
              <div className="mt-2 md:mt-0">
                <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700">
                  Selected: <span className="font-semibold text-neutral-900">{dayKeyToNice(selectedDay)}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
              <div className="md:col-span-5">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Title</label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Task title (required)"
                  className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-300"
                />
              </div>

              <div className="md:col-span-5">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Note</label>
                <input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Optional note"
                  className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-300"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  onClick={addTodo}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                >
                  Add Todo
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Todo list */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-white" />
          <div className="relative flex flex-col gap-2 border-b border-slate-200 bg-white/80 backdrop-blur p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Tasks for {dayKeyToNice(selectedDay)}</p>
              <p className="mt-1 text-xs text-slate-500">Update tasks anytime. Status changes affect completion rate.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-white/80 backdrop-blur px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm">
                {todosForDay.length === 0 ? "No tasks" : `${todosForDay.length} task(s)`}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="relative p-6">
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 backdrop-blur p-6">
                <p className="text-sm font-semibold text-slate-900">Loading...</p>
                <p className="mt-1 text-sm text-slate-600">Fetching tasks for {dayKeyToNice(selectedDay)}</p>
              </div>
            </div>
          ) : todosForDay.length === 0 ? (
            <div className="relative p-6">
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 backdrop-blur p-6">
                <p className="text-sm font-semibold text-slate-900">No data</p>
                <p className="mt-1 text-sm text-slate-600">Add your first task for this date above.</p>
              </div>
            </div>
          ) : (
            <div className="relative p-4 md:p-5">
              <div className="space-y-3">
                {todosForDay.map((t) => {
                  const isEditing = editingId === t.id;

                  return (
                    <div
                      key={t.id}
                      className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        {/* Left */}
                        <div className="min-w-0 flex-1">
                          {!isEditing ? (
                            <>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                                <StatusPill status={t.status} />
                              </div>

                              {t.note ? <p className="mt-1 text-sm text-slate-600">{t.note}</p> : null}

                              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                                <span>Created: {fmtDateTime(t.createdAt)}</span>
                                <span>Updated: {fmtDateTime(t.updatedAt)}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Update todo</p>
                              <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                                <input
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  placeholder="Task title"
                                  className="w-full rounded-2xl border border-slate-200 bg-white/90 backdrop-blur px-4 py-2 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-300"
                                />
                                <input
                                  value={editNote}
                                  onChange={(e) => setEditNote(e.target.value)}
                                  placeholder="Note (optional)"
                                  className="w-full rounded-2xl border border-slate-200 bg-white/90 backdrop-blur px-4 py-2 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-sky-200"
                                />
                              </div>
                            </>
                          )}
                        </div>

                        {/* Right */}
                        <div className="flex flex-col gap-2 md:items-end">
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={t.status}
                              onChange={(e) => setStatus(t.id, e.target.value as TodoStatus)}
                              className="h-10 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-300"
                            >
                              <option value="Status">Status</option>
                              <option value="Incomplete">Incomplete</option>
                              <option value="Complete">Complete</option>
                            </select>

                            {!isEditing ? (
                              <button
                                onClick={() => startEdit(t)}
                                className="h-10 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur px-3 text-sm font-medium text-slate-800 hover:bg-white shadow-sm"
                              >
                                Update
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => saveEdit(t.id)}
                                  className="h-10 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-600 px-3 text-sm font-semibold text-white shadow-sm hover:brightness-[1.02] active:brightness-[0.98]"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="h-10 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur px-3 text-sm font-medium text-slate-700 hover:bg-white shadow-sm"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>

                          <button
                            onClick={() => removeTodo(t.id)}
                            className="h-10 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur px-3 text-sm font-medium text-slate-700 hover:bg-white shadow-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>

        {/* Bottom hint */}
        <div className="text-center text-xs text-slate-500">
          Tip: use the Date picker to create/see tasks on any previous day.
        </div>
      </div>
    </div>
  );
}
