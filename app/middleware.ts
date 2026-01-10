import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth/auth";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const token = req.cookies.get("session")?.value;
  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const session = await verifySession(token);

    // Check which group we are in by URL prefix
    // NOTE: these are your visible URLs; route groups are not in URLs.
    // So protect by "sections" you control (dashboards and any subroutes).
    if (pathname.startsWith("/admindashboard")) {
      if (session.role !== "ADMIN") return redirectByRole(req, session.role);
    }

    if (pathname.startsWith("/leadsdashboard")) {
      if (session.role !== "LEAD") return redirectByRole(req, session.role);
    }

    if (pathname.startsWith("/userdashboard")) {
      if (session.role !== "USER") return redirectByRole(req, session.role);
    }

    return NextResponse.next();
  } catch {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

function redirectByRole(req: NextRequest, role: "ADMIN" | "LEAD" | "USER") {
  const url = req.nextUrl.clone();

  if (role === "ADMIN") url.pathname = "/admindashboard";
  else if (role === "LEAD") url.pathname = "/leadsdashboard";
  else url.pathname = "/userdashboard";

  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // protect whole sections (and any future sub-pages under them)
    "/admindashboard/:path*",
    "/leadsdashboard/:path*",
    "/userdashboard/:path*",
  ],
};
