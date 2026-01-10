import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signSession } from "@/lib/auth/auth"; // adjust if your file path differs

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function roleToDashboard(role: "ADMIN" | "LEAD" | "USER") {
  if (role === "ADMIN") return "/admindashboard";
  if (role === "LEAD") return "/leadsdashboard";
  return "/userdashboard";
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword && email.toLowerCase() === adminEmail.toLowerCase()) {
    if (password !== adminPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    let admin = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true, email: true, password: true, role: true },
    });

    if (!admin) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      admin = await prisma.user.create({
        data: { email: adminEmail, username: "admin", password: passwordHash, role: "ADMIN" },
        select: { id: true, email: true, password: true, role: true },
      });
    }

    const token = await signSession({
      sub: admin.id,
      email: admin.email,
      role: "ADMIN",
    });

    const res = NextResponse.json({ ok: true, redirectTo: roleToDashboard("ADMIN") });
    res.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, password: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signSession({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  const res = NextResponse.json({ ok: true, redirectTo: roleToDashboard(user.role) });
  res.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
