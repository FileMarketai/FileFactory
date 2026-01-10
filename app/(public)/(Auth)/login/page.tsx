"use client";

import Navbar from "@/components/ui/landingpage/Navbar";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FiEye, FiEyeOff, FiLock, FiMail } from "react-icons/fi";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setErr(data?.error ?? "Login failed");
      return;
    }

    router.push(next || data.redirectTo || "/");
  }

  return (
    <main className="relative min-h-screen bg-white text-slate-900">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-44 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[#4F6CF7]/20 blur-3xl" />
        <div className="absolute -bottom-44 right-0 h-[460px] w-[460px] rounded-full bg-[#3AC8E6]/15 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6">
        <Navbar/>
        {/* Center card */}
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-5xl">
            <div className="grid overflow-hidden rounded-3xl border border-[#E5E9F5] bg-white shadow-[0_22px_70px_-45px_rgba(15,23,42,0.45)] lg:grid-cols-2">
              {/* Left: form */}
              <div className="p-6 sm:p-10">
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Welcome back
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Enter your email and password to access your account.
                </p>

                <form onSubmit={onSubmit} className="mt-8 grid gap-4">
                  {/* Email */}
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">
                      Email
                    </label>
                    <div className="relative">
                      <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        className="w-full rounded-2xl border border-[#E5E9F5] bg-white py-3 pl-10 pr-3 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-[#4F6CF7]/45 focus:shadow-[0_0_0_4px_rgba(79,108,247,0.12)]"
                        placeholder="you@filemarket.ai"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        inputMode="email"
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
                        placeholder="Your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type={showPw ? "text" : "password"}
                        autoComplete="current-password"
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

                  {/* Remember + Forgot */}
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-[#4F6CF7] focus:ring-[#4F6CF7]"
                      />
                      Remember me
                    </label>

                    {/* If you don't have a route yet, leave it as # */}
                    <Link
                      href="#"
                      className="text-sm font-medium text-[#4F6CF7] hover:underline"
                    >
                      Forgot your password?
                    </Link>
                  </div>

                  {/* Error */}
                  {err && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {err}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    disabled={loading}
                    type="submit"
                    className="mt-1 inline-flex items-center justify-center rounded-2xl bg-[#4F6CF7] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#5B6EF5] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? "Logging in..." : "Log in"}
                  </button>

                  <p className="pt-2 text-center text-sm text-slate-600">
                    Don&apos;t have an account?{" "}
                    <Link
                      href="/signup"
                      className="font-semibold text-[#4F6CF7] hover:underline"
                    >
                      Register now
                    </Link>
                  </p>

                  <div className="pt-3 text-xs text-slate-500">
                    Admin login uses dummy credentials from{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5">
                      .env
                    </code>{" "}
                    (ADMIN_EMAIL / ADMIN_PASSWORD).
                  </div>
                </form>
              </div>

              {/* Right: promo panel (inspired by screenshot; matches brand colors) */}
              <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#4F6CF7] to-[#3AC8E6] p-10 text-white lg:block">
                {/* soft pattern */}
                <div className="pointer-events-none absolute inset-0 opacity-25">
                  <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-white/20 blur-2xl" />
                  <div className="absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-black/10 blur-2xl" />
                  <div className="absolute left-10 top-10 h-56 w-56 rounded-3xl bg-white/10" />
                  <div className="absolute right-10 bottom-10 h-56 w-56 rounded-3xl bg-white/10" />
                </div>

                <div className="relative">
                  <h2 className="text-3xl font-extrabold tracking-tight">
                    Effortlessly manage your team and operations.
                  </h2>
                  <p className="mt-3 max-w-md text-sm text-white/85">
                    Log in to access your internal dashboard and coordinate
                    projects, remote teams, and weekly reporting.
                  </p>

                  {/* Mock dashboard card */}
                  <div className="mt-8 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-white/90">
                          Snapshot
                        </div>
                        <div className="text-xs text-white/75">Today</div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white/10 p-3">
                          <div className="text-xs text-white/80">
                            Tasks completed
                          </div>
                          <div className="mt-1 text-2xl font-bold">128</div>
                          <div className="mt-2 h-2 w-full rounded-full bg-white/15">
                            <div className="h-2 w-[70%] rounded-full bg-white/80" />
                          </div>
                        </div>

                        <div className="rounded-xl bg-white/10 p-3">
                          <div className="text-xs text-white/80">
                            QA passing rate
                          </div>
                          <div className="mt-1 text-2xl font-bold">94%</div>
                          <div className="mt-2 grid grid-cols-6 gap-1">
                            {Array.from({ length: 12 }).map((_, i) => (
                              <div
                                key={i}
                                className={[
                                  "h-7 rounded-lg bg-white/15",
                                  i % 3 === 0 ? "bg-white/25" : "",
                                  i % 4 === 0 ? "bg-white/35" : "",
                                ].join(" ")}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-white/10 p-3">
                        <div className="text-xs text-white/80">
                          Recent activity
                        </div>
                        <div className="mt-2 grid gap-2 text-xs">
                          {[
                            "Team Lead review — In progress",
                            "New contributor onboarding — Queued",
                            "Weekly report export — Completed",
                          ].map((t) => (
                            <div
                              key={t}
                              className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2"
                            >
                              <span className="text-white/90">{t}</span>
                              <span className="text-white/70">•</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 text-xs text-white/75">
                    FileMarket AI internal access only.
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom small links (optional) */}
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
