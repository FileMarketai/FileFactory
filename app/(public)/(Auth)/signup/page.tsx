"use client";

import Navbar from "@/components/ui/landingpage/Navbar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { FiEye, FiEyeOff, FiLock, FiMail, FiUser } from "react-icons/fi";

type Role = "USER" | "LEAD";

export default function SignupPage() {
  const router = useRouter();

  const [role, setRole] = useState<Role>("USER");
  const [username, setUsername] = useState(""); // NEW
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const pwMismatch = useMemo(() => {
    if (!password || !confirm) return false;
    return password !== confirm;
  }, [password, confirm]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOkMsg(null);

    if (!username.trim() || username.trim().length < 3) {
      setErr("Username must be at least 3 characters.");
      return;
    }

    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(), // NEW
        email,
        password,
        role,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setErr(data?.error ?? "Signup failed");
      return;
    }

    setOkMsg("Account created. Redirecting to login...");
    setTimeout(() => router.push("/login"), 650);
  }

  return (
    <main className="relative min-h-screen bg-white text-slate-900">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-44 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[#4F6CF7]/20 blur-3xl" />
        <div className="absolute -bottom-44 right-0 h-[460px] w-[460px] rounded-full bg-[#3AC8E6]/15 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6">
        <Navbar />

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-5xl">
            <div className="grid overflow-hidden rounded-3xl border border-[#E5E9F5] bg-white shadow-[0_22px_70px_-45px_rgba(15,23,42,0.45)] lg:grid-cols-2">
              <div className="p-6 sm:p-10">
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Create your account
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Sign up to access FileMarket AI internal tools.
                </p>

                <form onSubmit={onSubmit} className="mt-8 grid gap-4">
                  {/* Role */}
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">
                      Signup as
                    </label>
                    <div className="relative">
                      <FiUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as Role)}
                        className="w-full appearance-none rounded-2xl border border-[#E5E9F5] bg-white py-3 pl-10 pr-10 text-sm outline-none focus:border-[#4F6CF7]/45 focus:shadow-[0_0_0_4px_rgba(79,108,247,0.12)]"
                      >
                        <option value="USER">User</option>
                        <option value="LEAD">Team Lead</option>
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        ▾
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Admin accounts are created by admins only.
                    </p>
                  </div>

                  {/* Username (NEW) */}
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">
                      Username
                    </label>
                    <div className="relative">
                      <FiUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        className="w-full rounded-2xl border border-[#E5E9F5] bg-white py-3 pl-10 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#4F6CF7]/45 focus:shadow-[0_0_0_4px_rgba(79,108,247,0.12)]"
                        placeholder="e.g. samrat"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        required
                        minLength={3}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Use letters/numbers/underscores. Unique per user.
                    </p>
                  </div>

                  {/* Email */}
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">
                      Email
                    </label>
                    <div className="relative">
                      <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        className="w-full rounded-2xl border border-[#E5E9F5] bg-white py-3 pl-10 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#4F6CF7]/45 focus:shadow-[0_0_0_4px_rgba(79,108,247,0.12)]"
                        placeholder="you@filemarket.ai"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        inputMode="email"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">
                      Password
                    </label>
                    <div className="relative">
                      <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        className="w-full rounded-2xl border border-[#E5E9F5] bg-white py-3 pl-10 pr-10 text-sm outline-none placeholder:text-slate-400 focus:border-[#4F6CF7]/45 focus:shadow-[0_0_0_4px_rgba(79,108,247,0.12)]"
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type={showPw ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                        aria-label={showPw ? "Hide password" : "Show password"}
                      >
                        {showPw ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">
                      Confirm password
                    </label>
                    <div className="relative">
                      <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        className={[
                          "w-full rounded-2xl border bg-white py-3 pl-10 pr-10 text-sm outline-none placeholder:text-slate-400 focus:shadow-[0_0_0_4px_rgba(79,108,247,0.12)]",
                          pwMismatch
                            ? "border-red-300 focus:border-red-300"
                            : "border-[#E5E9F5] focus:border-[#4F6CF7]/45",
                        ].join(" ")}
                        placeholder="Re-enter your password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        type={showConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                        aria-label={
                          showConfirm ? "Hide password" : "Show password"
                        }
                      >
                        {showConfirm ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>

                    {pwMismatch && (
                      <div className="text-xs text-red-600">
                        Passwords do not match.
                      </div>
                    )}
                  </div>

                  {err && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {err}
                    </div>
                  )}
                  {okMsg && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {okMsg}
                    </div>
                  )}

                  <button
                    disabled={loading}
                    type="submit"
                    className="mt-1 inline-flex items-center justify-center rounded-2xl bg-[#4F6CF7] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#5B6EF5] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? "Creating..." : "Create account"}
                  </button>

                  <p className="pt-2 text-center text-sm text-slate-600">
                    Already have an account?{" "}
                    <Link
                      href="/login"
                      className="font-semibold text-[#4F6CF7] hover:underline"
                    >
                      Log in
                    </Link>
                  </p>

                  <div className="pt-3 text-xs text-slate-500">
                    By signing up you agree to internal security policies and
                    acceptable use guidelines.
                  </div>
                </form>
              </div>

              {/* Right panel unchanged (keep your current one) */}
              <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#4F6CF7] to-[#3AC8E6] p-10 text-white lg:block">
                <div className="pointer-events-none absolute inset-0 opacity-25">
                  <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-white/20 blur-2xl" />
                  <div className="absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-black/10 blur-2xl" />
                  <div className="absolute left-10 top-10 h-56 w-56 rounded-3xl bg-white/10" />
                  <div className="absolute right-10 bottom-10 h-56 w-56 rounded-3xl bg-white/10" />
                </div>

                <div className="relative">
                  <h2 className="text-3xl font-extrabold tracking-tight">
                    Join the internal workspace.
                  </h2>
                  <p className="mt-3 max-w-md text-sm text-white/85">
                    Create an account to coordinate remote teams, manage tasks,
                    track QA, and submit weekly reporting — all in one place.
                  </p>

                  <div className="mt-6 text-xs text-white/75">
                    FileMarket AI internal access only.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
              <span>© {new Date().getFullYear()} FileMarket AI Data Labs</span>
              <Link href="#" className="hover:text-slate-700">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
