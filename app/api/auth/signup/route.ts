import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const BodySchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and _"),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { username, email, password } = parsed.data;

  const [emailExists, usernameExists] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { username } }), // username is @unique
  ]);

  if (emailExists) return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  if (usernameExists) return NextResponse.json({ error: "Username already exists" }, { status: 409 });

  // If no leads exist yet, this signup becomes the first LEAD
  const leadCount = await prisma.user.count({
    where: { role: Role.LEAD },
  });

  let role: Role = Role.USER;
  let teamLeadId: string | null = null;

  if (leadCount === 0) {
    role = Role.LEAD;
  } else {
    // Assign USER to least-loaded active LEAD
    const leads = await prisma.user.findMany({
      where: { role: Role.LEAD, isActive: true },
      select: {
        id: true,
        createdAt: true,
        _count: { select: { members: true } },
      },
    });

    if (leads.length === 0) {
      return NextResponse.json(
        { error: "No active Team Leads exist. Activate a lead or create a new lead." },
        { status: 409 }
      );
    }

    leads.sort((a, b) => {
      const diff = a._count.members - b._count.members;
      if (diff !== 0) return diff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    teamLeadId = leads[0].id;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      username,
      email,
      password: passwordHash,
      role,
      isActive: true, // default true in schema, explicit is ok
      teamLeadId, // null for LEAD, set for USER
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
