"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { JSX, useMemo, useState } from "react";
import { HiOutlineMenuAlt3 } from "react-icons/hi";
import { MdDashboard } from "react-icons/md";
import { FaUserCircle, FaFileAlt, FaMoneyCheckAlt, FaSignOutAlt } from "react-icons/fa";
import { RiQuestionnaireLine } from "react-icons/ri";
import { BsFlag } from "react-icons/bs";
import { FiSettings } from "react-icons/fi";
import { FiUsers } from "react-icons/fi";

type NavItem = {
  name: string;
  link: string;
  icon: JSX.Element;
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => setIsCollapsed((v) => !v);

  const main: NavItem[] = useMemo(
    () => [
      { name: "Dashboard", link: "/admindashboard", icon: <MdDashboard /> },
      { name: "Attendence", link: "/adminattendence", icon: <FiUsers /> },
      { name: "Profile", link: "/profile", icon: <FaUserCircle /> },
      { name: "Payment History", link: "/paymenthistory", icon: <FaMoneyCheckAlt /> },
      { name: "Reports", link: "/sendreport", icon: <FaFileAlt /> },
    ],
    []
  );

  const other: NavItem[] = useMemo(
    () => [
      { name: "Help Center", link: "/help", icon: <RiQuestionnaireLine /> },
      { name: "Report Issue", link: "/report", icon: <BsFlag /> },
      { name: "Settings", link: "/setting", icon: <FiSettings /> },
    ],
    []
  );

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  const renderItem = (item: NavItem) => {
    const active = isActive(item.link);

    return (
      <Link
        href={item.link}
        key={item.link}
        className={[
          "group flex items-center gap-3 rounded-2xl px-3 py-2 transition-all",
          active
            ? "bg-[#4F6CF7]/10 text-[#2D49D7] shadow-[0_0_0_4px_rgba(79,108,247,0.10)]"
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
          isCollapsed ? "justify-center" : "",
        ].join(" ")}
        title={isCollapsed ? item.name : undefined}
      >
        <span
          className={[
            "text-xl",
            active ? "text-[#2D49D7]" : "text-slate-500 group-hover:text-slate-700",
          ].join(" ")}
        >
          {item.icon}
        </span>
        {!isCollapsed && (
          <span className={["text-sm", active ? "font-semibold" : "font-medium"].join(" ")}>
            {item.name}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={[
        "sticky top-0 h-screen shrink-0 bg-white",
        "border-r border-[#E5E9F5]",
        "transition-all duration-300",
        isCollapsed ? "w-20" : "w-72",
      ].join(" ")}
    >
      <div className="flex h-full flex-col justify-between p-3">
        {/* Top */}
        <div className="space-y-4">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <button
              onClick={toggleSidebar}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <HiOutlineMenuAlt3 className="text-2xl" />
            </button>
          </div>

          {/* Logo */}
          <Link
            href="/"
            className={[
              "flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-slate-100",
              isCollapsed ? "justify-center" : "",
            ].join(" ")}
          >
            <Image
              src="/filemarketai_logo.png"
              alt="FileMarket AI"
              width={40}
              height={40}
              priority
              className="rounded-xl"
            />
            {!isCollapsed && (
              <div className="leading-tight">
                <div className="text-sm font-semibold text-slate-900">FileFactory</div>
                <div className="text-xs text-slate-500">Internal workspace</div>
              </div>
            )}
          </Link>

          {/* Main nav */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-2 text-xs font-semibold text-slate-500">MENU</div>
            )}
            <div className="grid gap-1">{main.map(renderItem)}</div>
          </div>

          <div className="border-t border-[#E5E9F5]" />

          {/* Other nav */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-2 text-xs font-semibold text-slate-500">OTHER</div>
            )}
            <div className="grid gap-1">{other.map(renderItem)}</div>
          </div>
        </div>

        {/* Bottom: Logout */}
        <div className="pt-3">
          <button
            onClick={handleLogout}
            className={[
              "flex w-full items-center gap-3 rounded-2xl px-3 py-2 transition-all",
              "text-red-600 hover:bg-red-50",
              isCollapsed ? "justify-center" : "",
            ].join(" ")}
            title={isCollapsed ? "Logout" : undefined}
          >
            <FaSignOutAlt className="text-xl" />
            {!isCollapsed && <span className="text-sm font-semibold">Logout</span>}
          </button>

          {!isCollapsed && (
            <div className="mt-3 rounded-2xl border border-[#E5E9F5] bg-white px-3 py-2 text-xs text-slate-500">
              © {new Date().getFullYear()} FileMarket AI Data Labs
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
