import { prisma } from "@/lib/prisma";

export function startOfDayUTC(d: Date) {
  // normalize to 00:00:00 UTC so day is stable across timezones
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function parseDayParam(dayStr: string | null) {
  const d = dayStr ? new Date(dayStr) : new Date();
  if (Number.isNaN(d.getTime())) throw new Error("Invalid day");
  return startOfDayUTC(d);
}

export async function getAllowedUserIds(currentUser: { id: string; role: "ADMIN" | "LEAD" | "USER" }) {
  if (currentUser.role === "ADMIN") return null; // means "all"

  if (currentUser.role === "LEAD") {
    const members = await prisma.user.findMany({
      where: { teamLeadId: currentUser.id },
      select: { id: true },
    });
    return [currentUser.id, ...members.map((m) => m.id)];
  }

  return [currentUser.id];
}
