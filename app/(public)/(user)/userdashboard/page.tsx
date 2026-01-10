export default function UserDashboard() {
  return (
    <div style={{ padding: 20 }}>
      <h1>User Dashboard</h1>
      <form action="/api/auth/logout" method="post">
        <button type="submit">Logout</button>
      </form>
    </div>
  );
}
