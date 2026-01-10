import Navbar from "@/components/ui/landingpage/Navbar";
import Image from "next/image";
import Link from "next/link";
import {
  FiLogIn,
  FiUserPlus,
  FiLayers,
  FiCheckSquare,
  FiBarChart2,
  FiShield,
  FiActivity,
  FiUsers,
} from "react-icons/fi";

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-white text-slate-900">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-44 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[#4F6CF7]/20 blur-3xl" />
        <div className="absolute -bottom-44 right-0 h-[460px] w-[460px] rounded-full bg-[#3AC8E6]/15 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6">
        <Navbar/>
        {/* Main content */}
        <div className="flex-1">
          {/* Hero */}
          <section className="pb-12 pt-6">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-[#4F6CF7]/20 bg-[#EEF2FF] px-3 py-1 text-xs font-medium text-[#4F6CF7]">
                  <FiShield />
                  Internal team management for FileMarket AI
                </p>

                <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                  Manage remote teams clearly, without busywork
                </h1>

                <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                  A simple internal webapp for tracking projects, tasks, team
                  activity, and weekly progress. Built for speed, clarity, and
                  accountability.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4F6CF7] px-5 py-3 text-sm font-semibold text-white hover:bg-[#5B6EF5]"
                  >
                    <FiUserPlus />
                    Get started
                  </Link>

                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold hover:bg-slate-50"
                  >
                    <FiLogIn />
                    I already have an account
                  </Link>
                </div>

                <div className="mt-4 inline-flex items-center gap-2 text-xs text-slate-500">
                  <FiUsers />
                  Private internal tool. Role-based access.
                </div>
              </div>

              {/* Mock panel */}
              <div className="relative">
                <div className="rounded-3xl border border-[#E5E9F5] bg-white p-5 shadow-[0_18px_60px_-35px_rgba(15,23,42,0.35)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">
                        Weekly overview
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Live snapshot of remote work
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#4F6CF7]">
                      <FiActivity />
                      Active
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#E5E9F5] p-4">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        Tasks done
                        <FiCheckSquare />
                      </div>
                      <div className="mt-2 text-2xl font-bold">128</div>
                      <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                        <div className="h-2 w-[72%] rounded-full bg-[#4F6CF7]" />
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        72% of weekly target
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#E5E9F5] p-4">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        Calls recorded
                        <FiBarChart2 />
                      </div>
                      <div className="mt-2 text-2xl font-bold">43h</div>
                      <div className="mt-2 text-xs text-slate-600">
                        QA passing rate: 94%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="pb-12">
            <div className="grid gap-5 md:grid-cols-3">
              <FeatureCard
                icon={<FiLayers />}
                title="Projects and roles"
                desc="Admin / Lead / User access. Clear ownership."
              />
              <FeatureCard
                icon={<FiCheckSquare />}
                title="Task tracking"
                desc="Statuses, comments, and weekly progress."
              />
              <FeatureCard
                icon={<FiBarChart2 />}
                title="Reporting"
                desc="Simple operational and QA summaries."
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="border-t border-[#E5E9F5] py-6">
          <div className="flex flex-col items-center justify-between gap-3 text-sm text-slate-600 sm:flex-row">
            <div className="flex items-center gap-2">
              <Image
                src="/filemarketai_logo.png"
                alt="FileMarket AI"
                width={22}
                height={22}
              />
              <span>
                © {new Date().getFullYear()} FileMarket AI Data Labs
              </span>
            </div>

            <div className="flex gap-4">
              <Link href="/login" className="hover:text-slate-900">
                Login
              </Link>
              <Link href="/signup" className="hover:text-slate-900">
                Sign up
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-3xl border border-[#E5E9F5] bg-white p-6 shadow-[0_16px_50px_-40px_rgba(15,23,42,0.35)]">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4F6CF7]">
          {icon}
        </div>
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mt-2 text-sm text-slate-600">{desc}</p>
        </div>
      </div>
    </div>
  );
}
