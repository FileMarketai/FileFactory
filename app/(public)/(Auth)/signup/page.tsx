"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Role = "USER" | "LEAD";

export default function SignupPage() {
  const router = useRouter();

  const [role, setRole] = useState<Role>("USER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOkMsg(null);
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setErr(data?.error ?? "Signup failed");
      return;
    }

    setOkMsg("Account created. You can login now.");
    setTimeout(() => router.push("/login"), 600);
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1>Sign up</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          Signup as
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="USER">User</option>
            <option value="LEAD">Team Lead</option>
          </select>
        </label>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="new-password"
        />

        {err && <p style={{ color: "crimson" }}>{err}</p>}
        {okMsg && <p style={{ color: "green" }}>{okMsg}</p>}

        <button disabled={loading} type="submit">
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>

      <p style={{ marginTop: 16 }}>
        Already have an account? <a href="/login">Login</a>
      </p>
    </div>
  );
}
