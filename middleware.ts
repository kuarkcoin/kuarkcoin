import { NextResponse, type NextRequest } from "next/server";
import { appendSafeNextParam } from "@/lib/auth/safe-redirect";

const PROTECTED_PREFIXES = ["/account", "/admin"];

function hasSupabaseSession(request: NextRequest) {
  if (request.headers.get("authorization")?.toLowerCase().startsWith("bearer ")) return true;
  return request.cookies.getAll().some((cookie) =>
    cookie.name === "sb-access-token" ||
    cookie.name === "supabase-auth-token" ||
    (cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token")),
  );
}

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtected(pathname)) return NextResponse.next();
  if (hasSupabaseSession(request)) return NextResponse.next();

  const loginPath = appendSafeNextParam("/login", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(new URL(loginPath, request.url));
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
