"use client";

import { useLayoutEffect, useState } from "react";
import Image from "next/image";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function UserSettingsPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // ✅ declare before useLayoutEffect (fixes "Cannot access variable before it is declared")
  function applyTheme(newTheme: "light" | "dark") {
    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", newTheme);
  }

  useLayoutEffect(() => {
    // Check localStorage or system preference
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  function toggleTheme() {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    applyTheme(newTheme);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-100 via-sky-100 to-indigo-100 dark:from-emerald-900/30 dark:via-sky-900/30 dark:to-indigo-900/30 opacity-80" />
              <Image
                src="/filemarketai_logo.png"
                alt="FileMarket AI"
                width={34}
                height={34}
                priority
                className="relative"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  Settings
                </h1>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400">
                Manage your preferences and account settings.
              </p>
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-emerald-900/10 dark:via-slate-800 dark:to-sky-900/10" />

          <div className="relative p-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-400 via-sky-400 to-indigo-500 flex items-center justify-center text-white text-lg font-semibold shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Appearance
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Customize the look and feel of the application
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Theme Toggle */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Theme
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Switch between light and dark mode
                    </div>
                  </div>

                  <button
                    onClick={toggleTheme}
                    className={cn(
                      "relative inline-flex h-11 w-20 items-center rounded-2xl transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-600",
                      theme === "dark"
                        ? "bg-gradient-to-r from-emerald-500 to-sky-600"
                        : "bg-slate-200 dark:bg-slate-700"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-9 w-9 transform rounded-xl bg-white shadow-lg transition-transform",
                        theme === "dark" ? "translate-x-10" : "translate-x-1"
                      )}
                    >
                      <div className="flex h-full w-full items-center justify-center">
                        {theme === "dark" ? (
                          <svg className="h-5 w-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                            />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                        )}
                      </div>
                    </span>
                  </button>
                </div>
              </div>

              {/* Theme Info */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-sky-500" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Current Theme
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {theme === "dark"
                        ? "Dark mode is active. The interface uses a dark color scheme for reduced eye strain in low-light conditions."
                        : "Light mode is active. The interface uses a light color scheme for optimal visibility."}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-emerald-50 dark:from-sky-900/10 dark:via-slate-800 dark:to-emerald-900/10" />

          <div className="relative p-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-400 via-indigo-400 to-purple-500 flex items-center justify-center text-white text-lg font-semibold shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Account</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Manage your account preferences</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Configure how you receive notifications
                </div>
                <div className="mt-3 text-xs text-slate-400 dark:text-slate-500 italic">Coming soon...</div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Privacy</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Manage your privacy settings
                </div>
                <div className="mt-3 text-xs text-slate-400 dark:text-slate-500 italic">Coming soon...</div>
              </div>
            </div>
          </div>
        </div>

        {/* Other Settings */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-900/10 dark:via-slate-800 dark:to-purple-900/10" />

          <div className="relative p-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-500 flex items-center justify-center text-white text-lg font-semibold shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Other</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Additional settings and preferences</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Language</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Select your preferred language
                </div>
                <div className="mt-3 text-xs text-slate-400 dark:text-slate-500 italic">Coming soon...</div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Data Export</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Export your data and reports
                </div>
                <div className="mt-3 text-xs text-slate-400 dark:text-slate-500 italic">Coming soon...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
