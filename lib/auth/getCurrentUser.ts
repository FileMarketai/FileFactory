// lib/auth/getCurrentUser.ts
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/auth";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const payload = await verifySession(token);
  if (!payload?.sub) return null;

  // Fetch user + team lead
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      teamLead: {
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  // optional: block deactivated users from seeing dashboard
  if (!user?.isActive) return null;

  return user;
}
