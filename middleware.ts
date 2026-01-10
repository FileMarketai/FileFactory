import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth/auth";

const AUTH_PAGES = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdmin = pathname.startsWith("/admindashboard");
  const isLead = pathname.startsWith("/leadsdashboard");
  const isUser = pathname.startsWith("/userdashboard");

  const isAuthPage = AUTH_PAGES.includes(pathname);

  const token = req.cookies.get("session")?.value;

  // If visiting /login or /signup while already logged in -> go to dashboard
  if (isAuthPage && token) {
    try {
      const session = await verifySession(token);
      return redirectToRoleDashboard(req, session.role);
    } catch {
      // invalid token -> allow login/signup
      return NextResponse.next();
    }
  }

  // If it's not a protected section, let it pass
  if (!isAdmin && !isLead && !isUser) return NextResponse.next();

  // Not logged in -> redirect to login
  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const session = await verifySession(token);

    if (isAdmin && session.role !== "ADMIN") return redirectToRoleDashboard(req, session.role);
    if (isLead && session.role !== "LEAD") return redirectToRoleDashboard(req, session.role);
    if (isUser && session.role !== "USER") return redirectToRoleDashboard(req, session.role);

    return NextResponse.next();
  } catch {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

function redirectToRoleDashboard(req: NextRequest, role: "ADMIN" | "LEAD" | "USER") {
  const url = req.nextUrl.clone();
  url.pathname =
    role === "ADMIN"
      ? "/admindashboard"
      : role === "LEAD"
      ? "/leadsdashboard"
      : "/userdashboard";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/admindashboard/:path*",
    "/leadsdashboard/:path*",
    "/userdashboard/:path*",
  ],
};
