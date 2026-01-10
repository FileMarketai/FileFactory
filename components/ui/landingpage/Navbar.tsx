"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiLogIn, FiUserPlus, FiGrid, FiLogOut } from "react-icons/fi";

type SessionUser =
  | null
  | {
      userId: string; // or "id" depending on your verifySession payload
      role: "ADMIN" | "LEAD" | "USER";
      username?: string;
      email?: string;
    };

function roleToDashboard(role: "ADMIN" | "LEAD" | "USER") {
  if (role === "ADMIN") return "/admindashboard";
  if (role === "LEAD") return "/leadsdashboard";
  return "/userdashboard";
}

export default function Navbar() {
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setUser(data?.user ?? null))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="flex items-center justify-between py-5">
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/filemarketai_logo.png"
          alt="FileMarket AI"
          width={36}
          height={36}
          priority
        />
        <span className="text-sm font-semibold tracking-tight sm:text-base">
          FileFactory
        </span>
      </Link>

      <nav className="flex items-center gap-2 sm:gap-3">
        {loading ? null : user ? (
          <>
            <Link
              href={roleToDashboard(user.role)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#4F6CF7] px-3 py-2 text-sm font-semibold text-white hover:bg-[#5B6EF5]"
            >
              <FiGrid />
              Dashboard
            </Link>

            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <FiLogOut />
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <FiLogIn />
              Login
            </Link>

            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-[#4F6CF7] px-3 py-2 text-sm font-semibold text-white hover:bg-[#5B6EF5]"
            >
              <FiUserPlus />
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
