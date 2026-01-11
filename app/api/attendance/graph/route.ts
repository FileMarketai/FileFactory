import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/auth";

async function getCurrentUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  try {
    const payload = await verifySession(token);
    return payload?.sub || null;
  } catch {
    return null;
  }
}

function monthRangeUTC(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { start, end };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const year = Number(url.searchParams.get("year"));
    const month = Number(url.searchParams.get("month"));

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid year/month" }, { status: 400 });
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { start, end } = monthRangeUTC(year, month);

    const rows = await prisma.attendance.findMany({
      where: { userId, day: { gte: start, lt: end } },
      orderBy: { day: "asc" },
      select: { day: true, workMinutes: true, checkOutAt: true },
    });

    const series = rows.map((r) => ({
      date: r.day.toISOString().slice(0, 10),
      hours: r.checkOutAt ? Math.round((r.workMinutes / 60) * 100) / 100 : 0,
    }));

    return NextResponse.json({ series });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
