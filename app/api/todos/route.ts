import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { parseDayKey, todayDayKeyUTC } from "@/lib/utils/day";

const CreateSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1),
  note: z.string().optional(),
});

export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const dayKey = url.searchParams.get("day") ?? todayDayKeyUTC();
  const day = parseDayKey(dayKey);
  if (!day) return NextResponse.json({ error: "Invalid day format (YYYY-MM-DD)" }, { status: 400 });

  const items = await prisma.todo.findMany({
    where: { userId: me.id, day },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, note: true, status: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ day: dayKey, items });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const day = parseDayKey(parsed.data.day);
  if (!day) return NextResponse.json({ error: "Invalid day format (YYYY-MM-DD)" }, { status: 400 });

  const created = await prisma.todo.create({
    data: {
      userId: me.id,
      day,
      title: parsed.data.title.trim(),
      note: parsed.data.note?.trim() ? parsed.data.note.trim() : null,
      status: "STATUS",
    },
    select: { id: true, title: true, note: true, status: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ item: created }, { status: 201 });
}
