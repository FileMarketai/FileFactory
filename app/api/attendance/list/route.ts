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
      where: {
        userId,
        day: { gte: start, lt: end },
      },
      orderBy: { day: "desc" },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
    });

    return NextResponse.json({
      rows: rows.map((r) => ({
        id: r.id,
        day: r.day.toISOString(),
        checkInAt: r.checkInAt.toISOString(),
        checkOutAt: r.checkOutAt ? r.checkOutAt.toISOString() : null,
        workMinutes: r.workMinutes,
        user: r.user,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
