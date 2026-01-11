import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import Image from "next/image";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default async function UserProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-100 via-sky-100 to-indigo-100 opacity-80" />
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
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Profile
                </h1>
              </div>

              <p className="text-sm text-slate-600">
                View your account details and team lead information.
              </p>
            </div>
          </div>
        </div>

        {/* User Details Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-sky-50" />

          <div className="relative p-5">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-400 via-sky-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-semibold shadow-sm">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{user.username}</h2>
                <p className="text-sm text-slate-500">{user.email}</p>
                <span className={cn(
                  "mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                  user.isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                )}>
                  {user.isActive ? "Active" : "Deactivated"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">User ID</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{user.id}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Role</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{user.role}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{user.email}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Account Created</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {new Date(user.createdAt).toLocaleDateString([], {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Lead Details Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-emerald-50" />

          <div className="relative p-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-400 via-indigo-400 to-purple-500 flex items-center justify-center text-white text-lg font-semibold shadow-sm">
                {user.teamLead ? user.teamLead.username.charAt(0).toUpperCase() : "?"}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Team Lead</h2>
                <p className="text-sm text-slate-500">
                  {user.teamLead ? "Your assigned team lead" : "No team lead assigned"}
                </p>
              </div>
            </div>

            {user.teamLead ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Username</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{user.teamLead.username}</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{user.teamLead.email}</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Role</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{user.teamLead.role}</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</div>
                  <div className="mt-1">
                    <span className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                      user.teamLead.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                    )}>
                      {user.teamLead.isActive ? "Active" : "Deactivated"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 backdrop-blur p-6 text-center">
                <p className="text-sm font-semibold text-slate-900">No Team Lead Assigned</p>
                <p className="mt-1 text-sm text-slate-600">
                  Contact your administrator to assign a team lead.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
