import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { parseDayParam, startOfDayUTC } from "@/lib/attendance";

function monthRangeUTC(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { start, end };
}

export async function GET(req: Request) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const year = Number(url.searchParams.get("year"));
    const month = Number(url.searchParams.get("month"));
    const dayStr = url.searchParams.get("day");

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid year/month" }, { status: 400 });
    }

    const targetDay = dayStr ? parseDayParam(dayStr) : startOfDayUTC(new Date());
    const { start: monthStart, end: monthEnd } = monthRangeUTC(year, month);

    let memberIds: string[] = [];

    if (me.role === "USER") {
      return NextResponse.json({ rows: [] });
    }

    if (me.role === "LEAD") {
      const members = await prisma.user.findMany({
        where: { teamLeadId: me.id },
        select: { id: true },
      });
      memberIds = members.map((m) => m.id);
    } else if (me.role === "ADMIN") {
      const users = await prisma.user.findMany({
        select: { id: true },
      });
      memberIds = users.map((u) => u.id);
    }

    // Get all members with their basic info
    const members = await prisma.user.findMany({
      where: {
        id: { in: memberIds },
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Get today's attendance for all members
    const todayAttendances = await prisma.attendance.findMany({
      where: {
        userId: { in: memberIds },
        day: targetDay,
      },
      select: {
        userId: true,
        checkInAt: true,
        checkOutAt: true,
        workMinutes: true,
      },
    });

    // Get monthly totals for all members
    const monthlyAttendances = await prisma.attendance.findMany({
      where: {
        userId: { in: memberIds },
        day: { gte: monthStart, lt: monthEnd },
        checkOutAt: { not: null },
      },
      select: {
        userId: true,
        workMinutes: true,
      },
    });

    // Create maps for quick lookup
    const todayMap = new Map(
      todayAttendances.map((a) => [
        a.userId,
        {
          checkInAt: a.checkInAt.toISOString(),
          checkOutAt: a.checkOutAt?.toISOString() ?? null,
          workMinutes: a.workMinutes,
        },
      ])
    );

    const monthlyMap = new Map<string, number>();
    for (const a of monthlyAttendances) {
      const current = monthlyMap.get(a.userId) ?? 0;
      monthlyMap.set(a.userId, current + a.workMinutes);
    }

    // Build response rows
    const rows = members.map((m) => {
      const today = todayMap.get(m.id);
      return {
        id: m.id,
        username: m.username,
        email: m.email,
        role: m.role,
        isActive: m.isActive,
        createdAt: m.createdAt.toISOString(),
        todayCheckInAt: today?.checkInAt ?? null,
        todayCheckOutAt: today?.checkOutAt ?? null,
        todayWorkMinutes: today?.workMinutes ?? null,
        monthMinutes: monthlyMap.get(m.id) ?? null,
      };
    });

    return NextResponse.json({ rows });
  } catch (e) {
    console.error("Error in teams/members API:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
