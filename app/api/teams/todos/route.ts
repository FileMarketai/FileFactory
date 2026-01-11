// File: FileFactory/app/api/teams/todos/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { Prisma } from "@prisma/client";

function parseISODateKey(dayKey: string) {
  // YYYY-MM-DD -> UTC midnight
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null;
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

function addDaysUTC(d: Date, days: number) {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "LEAD") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);

  const fromKey = url.searchParams.get("from") ?? "";
  const toKey = url.searchParams.get("to") ?? "";
  const status = (url.searchParams.get("status") ?? "all") as "all" | "complete" | "incomplete" | "status";
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  const page = clamp(Number(url.searchParams.get("page") ?? "1"), 1, 10_000);
  const pageSize = clamp(Number(url.searchParams.get("pageSize") ?? "10"), 1, 100);

  const fromDay = parseISODateKey(fromKey);
  const toDay = parseISODateKey(toKey);

  if (!fromDay || !toDay) {
    return NextResponse.json({ error: "Invalid from/to. Use YYYY-MM-DD" }, { status: 400 });
  }

  // inclusive range: [fromDay .. toDay] => use lt (toDay + 1)
  const toExclusive = addDaysUTC(toDay, 1);

  // Find members for this lead
  const membersWhere: Prisma.UserWhereInput = { teamLeadId: me.id };
  if (q) {
    membersWhere.OR = [
      { username: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [memberTotal, members] = await Promise.all([
    prisma.user.count({ where: membersWhere }),
    prisma.user.findMany({
      where: membersWhere,
      orderBy: { username: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
      },
    }),
  ]);

  // Build todo where filter
  const todoWhereBase: Prisma.TodoWhereInput = {
    day: { gte: fromDay, lt: toExclusive },
  };

  if (status !== "all") {
    todoWhereBase.status =
      status === "complete" ? "COMPLETE" : status === "incomplete" ? "INCOMPLETE" : "STATUS";
  }

  // Fetch todos for members in the page
  const memberIds = members.map((m) => m.id);

  // If no members, return empty
  if (memberIds.length === 0) {
    return NextResponse.json({
      rows: [],
      total: memberTotal,
      overall: { total: 0, completed: 0, incomplete: 0, pending: 0, completionRate: 0 },
    });
  }

  const todos = await prisma.todo.findMany({
    where: {
      userId: { in: memberIds },
      ...todoWhereBase,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { note: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ day: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      userId: true,
      title: true,
      note: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // group by userId
  const byUser = new Map<string, typeof todos>();
  for (const t of todos) {
    const arr = byUser.get(t.userId) ?? [];
    arr.push(t);
    byUser.set(t.userId, arr);
  }

  function summarize(items: { status: "STATUS" | "INCOMPLETE" | "COMPLETE" }[]) {
    const total = items.length;
    const completed = items.filter((x) => x.status === "COMPLETE").length;
    const incomplete = items.filter((x) => x.status === "INCOMPLETE").length;
    const pending = items.filter((x) => x.status === "STATUS").length;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, incomplete, pending, completionRate };
  }

  const rows = members.map((m) => {
    const memberTodos = byUser.get(m.id) ?? [];
    const stats = summarize(memberTodos);
    return {
      user: m,
      todos: memberTodos,
      stats,
    };
  });

  // overall stats for current page (fast). If you want overall for ALL members, we can compute separately.
  const allTodos = todos;
  const overallStats = summarize(allTodos);

  return NextResponse.json({
    rows,
    total: memberTotal,
    overall: overallStats,
  });
}
