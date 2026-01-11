import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { parseDayParam } from "@/lib/attendance";

export async function GET(req: Request) {
  try {
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can access this endpoint
    if (me.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const fromStr = url.searchParams.get("from");
    const toStr = url.searchParams.get("to");
    const status = url.searchParams.get("status") || "all";
    const q = url.searchParams.get("q") || "";
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(url.searchParams.get("pageSize")) || 10));

    if (!fromStr || !toStr) {
      return NextResponse.json({ error: "Missing 'from' or 'to' parameter" }, { status: 400 });
    }

    // Parse date range
    const fromDate = parseDayParam(fromStr);
    const toDate = parseDayParam(toStr);
    
    // Ensure toDate includes the entire day (next day at 00:00:00 for lte comparison)
    const toDateEnd = new Date(toDate);
    toDateEnd.setUTCDate(toDateEnd.getUTCDate() + 1);

    // Get all team leads (users who have members OR users with LEAD role)
    const allLeads = await prisma.user.findMany({
      where: {
        OR: [
          { role: "LEAD" },
          { members: { some: {} } }, // Has at least one member
        ],
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        members: {
          where: { isActive: true },
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { username: "asc" },
    });

    // Filter leads by search query
    let filteredLeads = allLeads;
    if (q.trim()) {
      const queryLower = q.trim().toLowerCase();
      filteredLeads = allLeads.filter(
        (lead) =>
          lead.username.toLowerCase().includes(queryLower) ||
          lead.email.toLowerCase().includes(queryLower) ||
          lead.members.some(
            (m) =>
              m.username.toLowerCase().includes(queryLower) ||
              m.email.toLowerCase().includes(queryLower)
          )
      );
    }

    // Get all member IDs across all teams
    const allMemberIds = new Set<string>();
    filteredLeads.forEach((lead) => {
      lead.members.forEach((m) => allMemberIds.add(m.id));
    });

    // Get attendance data for all members in the date range
    const attendances = await prisma.attendance.findMany({
      where: {
        userId: { in: Array.from(allMemberIds) },
        day: { gte: fromDate, lt: toDateEnd },
      },
      select: {
        userId: true,
        day: true,
        checkInAt: true,
        checkOutAt: true,
        workMinutes: true,
      },
      orderBy: { day: "desc" },
    });

    // Get latest attendance for each member (for lastStatus)
    const latestAttendances = await prisma.attendance.findMany({
      where: {
        userId: { in: Array.from(allMemberIds) },
      },
      select: {
        userId: true,
        day: true,
        checkInAt: true,
        checkOutAt: true,
      },
      orderBy: { day: "desc" },
    });

    // Group latest attendance by userId (get most recent)
    const latestMap = new Map<string, { checkInAt: Date; checkOutAt: Date | null; day: Date }>();
    for (const att of latestAttendances) {
      if (!latestMap.has(att.userId)) {
        latestMap.set(att.userId, {
          checkInAt: att.checkInAt,
          checkOutAt: att.checkOutAt,
          day: att.day,
        });
      }
    }

    // Group attendances by userId
    const attendanceByUser = new Map<string, typeof attendances>();
    for (const att of attendances) {
      if (!attendanceByUser.has(att.userId)) {
        attendanceByUser.set(att.userId, []);
      }
      attendanceByUser.get(att.userId)!.push(att);
    }

    // Build team blocks with member attendance
    const teams = filteredLeads.map((lead) => {
      const memberAttendances: Array<{
        userId: string;
        username: string;
        email: string;
        daysPresent: number;
        daysAbsent: number;
        totalWorkMinutes: number;
        lastStatus?: "present" | "absent" | "checkedin" | "unknown";
        lastCheckInAt?: string | null;
        lastCheckOutAt?: string | null;
      }> = [];

      for (const member of lead.members) {
        const memberAtts = attendanceByUser.get(member.id) || [];
        
        // Calculate stats
        let daysPresent = 0;
        let daysAbsent = 0;
        let totalWorkMinutes = 0;

        // Get all unique days in range (inclusive)
        const daysInRange = new Set<string>();
        const currentDay = new Date(fromDate);
        const endDay = new Date(toDate);
        while (currentDay <= endDay) {
          daysInRange.add(currentDay.toISOString().split("T")[0]);
          currentDay.setUTCDate(currentDay.getUTCDate() + 1);
        }

        // Count present/absent days
        const attendedDays = new Set<string>();
        for (const att of memberAtts) {
          const dayKey = att.day.toISOString().split("T")[0];
          attendedDays.add(dayKey);
          
          if (att.checkOutAt) {
            // Present: checked in and checked out
            daysPresent++;
            totalWorkMinutes += att.workMinutes;
          } else if (att.checkInAt) {
            // Checked in but not checked out
            daysPresent++;
            totalWorkMinutes += att.workMinutes;
          }
        }

        // Absent days = total days in range - present days
        daysAbsent = daysInRange.size - daysPresent;

        // Get latest status
        const latest = latestMap.get(member.id);
        let lastStatus: "present" | "absent" | "checkedin" | "unknown" = "unknown";
        let lastCheckInAt: string | null = null;
        let lastCheckOutAt: string | null = null;

        if (latest) {
          lastCheckInAt = latest.checkInAt.toISOString();
          lastCheckOutAt = latest.checkOutAt?.toISOString() ?? null;
          
          if (latest.checkOutAt) {
            lastStatus = "present";
          } else if (latest.checkInAt) {
            lastStatus = "checkedin";
          } else {
            lastStatus = "absent";
          }
        }

        memberAttendances.push({
          userId: member.id,
          username: member.username,
          email: member.email,
          daysPresent,
          daysAbsent,
          totalWorkMinutes,
          lastStatus,
          lastCheckInAt,
          lastCheckOutAt,
        });
      }

      // Calculate team aggregates
      const teamDaysPresent = memberAttendances.reduce((sum, m) => sum + m.daysPresent, 0);
      const teamDaysAbsent = memberAttendances.reduce((sum, m) => sum + m.daysAbsent, 0);
      const teamWorkMinutes = memberAttendances.reduce((sum, m) => sum + m.totalWorkMinutes, 0);

      return {
        leadId: lead.id,
        leadUsername: lead.username,
        leadEmail: lead.email,
        membersCount: memberAttendances.length,
        teamDaysPresent,
        teamDaysAbsent,
        teamWorkMinutes,
        members: memberAttendances,
      };
    });

    // Apply status filter: only show teams that have at least one member matching the status
    let teamsWithMembers = teams.filter((t) => t.members.length > 0);
    
    if (status !== "all") {
      teamsWithMembers = teamsWithMembers.filter((team) => {
        return team.members.some((member) => {
          if (status === "present") return member.lastStatus === "present";
          if (status === "checkedin") return member.lastStatus === "checkedin";
          if (status === "absent") return member.lastStatus === "absent";
          return true;
        });
      });
    }

    // Apply pagination
    const totalTeams = teamsWithMembers.length;
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginatedTeams = teamsWithMembers.slice(startIdx, endIdx);

    return NextResponse.json({
      teams: paginatedTeams,
      totalTeams,
    });
  } catch (e) {
    console.error("Error in admin/attendance/teams API:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
