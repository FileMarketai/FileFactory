import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { Role } from "@prisma/client";
import MemberStatusButton from "@/components/ui/Leads/MemberStatusButton";

export default async function LeadsDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role !== Role.LEAD) redirect("/login");

  const members = await prisma.user.findMany({
    where: {
      role: Role.USER,
      teamLeadId: user.id,
    },
    select: {
      id: true,
      username: true,
      email: true,
      isActive: true,
      deactivatedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div style={{ padding: 20 }}>
      <h1>Team Lead Dashboard</h1>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>My Details</h2>
        <p><b>Username:</b> {user.username}</p>
        <p><b>Email:</b> {user.email}</p>
        <p><b>Role:</b> {user.role}</p>
      </div>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>My Team Members ({members.length})</h2>

        {members.length === 0 ? (
          <p>No members assigned yet.</p>
        ) : (
            <div style={{ display: "grid", gap: 10 }}>
            {members.map((m: typeof members[number]) => (
              <div
              key={m.id}
              style={{
                padding: 12,
                border: "1px solid #eee",
                borderRadius: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
              >
              <div>
                <div style={{ fontWeight: 600 }}>{m.username}</div>
                <div style={{ fontSize: 14, opacity: 0.8 }}>{m.email}</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>
                <b>Status:</b> {m.isActive ? "Active" : "Deactivated"}
                {!m.isActive && m.deactivatedAt
                  ? ` (since ${new Date(m.deactivatedAt).toLocaleString()})`
                  : ""}
                </div>
              </div>

              <MemberStatusButton memberId={m.id} isActive={m.isActive} />
              </div>
            ))}
            </div>
        )}
      </div>

      <form action="/api/auth/logout" method="post" style={{ marginTop: 20 }}>
        <button type="submit">Logout</button>
      </form>
    </div>
  );
}
