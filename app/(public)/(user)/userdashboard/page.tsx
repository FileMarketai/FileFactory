// app/userdashboard/page.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export default async function UserDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div style={{ padding: 20 }}>
      <h1>User Dashboard</h1>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>My Details</h2>
        <p><b>ID:</b> {user.id}</p>
        <p><b>Username:</b> {user.username}</p>
        <p><b>Email:</b> {user.email}</p>
        <p><b>Role:</b> {user.role}</p>
        <p><b>Status:</b> {user.isActive ? "Active" : "Deactivated"}</p>
        <p><b>Created:</b> {new Date(user.createdAt).toLocaleString()}</p>
      </div>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>My Team Lead</h2>

        {user.teamLead ? (
          <>
            <p><b>Username:</b> {user.teamLead.username}</p>
            <p><b>Email:</b> {user.teamLead.email}</p>
            <p><b>Status:</b> {user.teamLead.isActive ? "Active" : "Deactivated"}</p>
          </>
        ) : (
          <p>No Team Lead assigned.</p>
        )}
      </div>

      <form action="/api/auth/logout" method="post" style={{ marginTop: 20 }}>
        <button type="submit">Logout</button>
      </form>
    </div>
  );
}
