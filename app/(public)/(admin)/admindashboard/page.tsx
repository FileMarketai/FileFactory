export default function AdminDashboard() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Dashboard</h1>

      <form action="/api/auth/logout" method="post">
        <button type="submit">Logout</button>
      </form>
    </div>
  );
}
