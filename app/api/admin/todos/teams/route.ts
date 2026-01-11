// File: FileFactory/app/api/admin/todos/teams/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

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

function summarize(items: { status: "STATUS" | "INCOMPLETE" | "COMPLETE" }[]) {
  const total = items.length;
  const completed = items.filter((x) => x.status === "COMPLETE").length;
  const incomplete = items.filter((x) => x.status === "INCOMPLETE").length;
  const pending = items.filter((x) => x.status === "STATUS").length;
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, incomplete, pending, completionRate };
}

export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);

  const fromKey = url.searchParams.get("from") ?? "";
  const toKey = url.searchParams.get("to") ?? "";
  const status = (url.searchParams.get("status") ?? "all") as "all" | "complete" | "incomplete" | "status";
  const q = (url.searchParams.get("q") ?? "").trim();

  const page = clamp(Number(url.searchParams.get("page") ?? "1"), 1, 10_000);
  const pageSize = clamp(Number(url.searchParams.get("pageSize") ?? "6"), 1, 50);

  const fromDay = parseISODateKey(fromKey);
  const toDay = parseISODateKey(toKey);

  if (!fromDay || !toDay) {
    return NextResponse.json({ error: "Invalid from/to. Use YYYY-MM-DD" }, { status: 400 });
  }

  const toExclusive = addDaysUTC(toDay, 1);

  // Filter leads by query (lead username/email), but also allow searching members and todos
  const leadWhere: Prisma.UserWhereInput = { role: "LEAD" };

  if (q) {
    leadWhere.OR = [
      { username: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      {
        members: {
          some: {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      },
      {
        members: {
          some: {
            todos: {
              some: {
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { note: { contains: q, mode: "insensitive" } },
                ],
                day: { gte: fromDay, lt: toExclusive },
              },
            },
          },
        },
      },
    ];
  }

  const [totalTeams, leads] = await Promise.all([
    prisma.user.count({ where: leadWhere }),
    prisma.user.findMany({
      where: leadWhere,
      orderBy: { username: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        username: true,
        email: true,
        members: {
          orderBy: { username: "asc" },
          select: {
            id: true,
            username: true,
            email: true,
            todos: {
              where: {
                day: { gte: fromDay, lt: toExclusive },
                ...(status === "all"
                  ? {}
                  : {
                      status:
                        status === "complete" ? "COMPLETE" : status === "incomplete" ? "INCOMPLETE" : "STATUS",
                    }),
                ...(q
                  ? {
                      OR: [
                        { title: { contains: q, mode: "insensitive" } },
                        { note: { contains: q, mode: "insensitive" } },
                      ],
                    }
                  : {}),
              },
              orderBy: [{ day: "desc" }, { updatedAt: "desc" }],
              select: {
                id: true,
                title: true,
                note: true,
                status: true,
                day: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const teams = leads.map((lead) => {
    const members = lead.members.map((m) => {
      const stats = summarize(m.todos);

      const last = m.todos.length
        ? m.todos
            .slice()
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
        : null;

      return {
        userId: m.id,
        username: m.username,
        email: m.email,
        totalTodos: stats.total,
        completed: stats.completed,
        incomplete: stats.incomplete,
        pending: stats.pending,
        completionRate: stats.completionRate,
        lastTodoStatus: last?.status ?? "STATUS",
        lastTodoTitle: last?.title ?? null,
        lastUpdatedAt: last?.updatedAt ?? null,
        todos: m.todos.map((t) => ({
          id: t.id,
          title: t.title,
          note: t.note,
          status: t.status,
          day: t.day.toISOString().slice(0, 10),
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        })),
      };
    });

    const teamTodos = members.flatMap((x) => x.todos);
    const teamStats = summarize(teamTodos);

    return {
      leadId: lead.id,
      leadUsername: lead.username,
      leadEmail: lead.email,
      membersCount: lead.members.length,

      teamTotalTodos: teamStats.total,
      teamCompleted: teamStats.completed,
      teamIncomplete: teamStats.incomplete,
      teamPending: teamStats.pending,
      teamCompletionRate: teamStats.completionRate,

      members,
    };
  });

  const overallTodos = teams.flatMap((t) => t.members.flatMap((m) => m.todos));
  const overallStats = summarize(overallTodos);

  return NextResponse.json({
    teams,
    totalTeams,
    overall: overallStats,
  });
}
