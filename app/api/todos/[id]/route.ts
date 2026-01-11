import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

const PatchSchema = z.object({
  title: z.string().min(1).optional(),
  note: z.string().optional().nullable(),
  status: z.enum(["STATUS", "INCOMPLETE", "COMPLETE"]).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await Promise.resolve(ctx.params);
  const id = params.id;

  const owned = await prisma.todo.findFirst({ where: { id, userId: me.id }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) {
    data.title = parsed.data.title.trim();
  }
  if (parsed.data.note !== undefined) {
    data.note = parsed.data.note && parsed.data.note.trim() ? parsed.data.note.trim() : null;
  }
  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status;
  }

  const updated = await prisma.todo.update({
    where: { id },
    data,
    select: { id: true, title: true, note: true, status: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ item: updated });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await Promise.resolve(ctx.params);
  const id = params.id;

  const owned = await prisma.todo.findFirst({ where: { id, userId: me.id }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.todo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
