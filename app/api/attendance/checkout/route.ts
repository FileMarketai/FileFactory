import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/auth";
import { z } from "zod";

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

const Body = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const day = new Date(parsed.data.day + "T00:00:00.000Z");
    const now = new Date();

    const existing = await prisma.attendance.findUnique({
      where: { userId_day: { userId, day } },
      select: { id: true, checkInAt: true, checkOutAt: true },
    });

    if (!existing) return NextResponse.json({ error: "No check-in found" }, { status: 400 });
    if (existing.checkOutAt) return NextResponse.json({ error: "Already checked out" }, { status: 400 });

    const mins = Math.max(0, Math.floor((now.getTime() - existing.checkInAt.getTime()) / 60000));

    await prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOutAt: now, workMinutes: mins },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
