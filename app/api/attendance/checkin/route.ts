import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { parseDayParam } from "@/lib/attendance";

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const day = parseDayParam(body?.day ?? null);

  // upsert so double-click doesn't create duplicates
  const now = new Date();

  try {
    const record = await prisma.attendance.upsert({
      where: { userId_day: { userId: me.id, day } },
      update: {
        // if already checked in, don't overwrite check-in time
      },
      create: {
        userId: me.id,
        day,
        checkInAt: now,
      },
    });

    return NextResponse.json({ ok: true, record });
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json({ error: "Failed to check in" }, { status: 500 });
  }
}
