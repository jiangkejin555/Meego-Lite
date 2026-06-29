import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/send-code",
]);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  const isAuthed = Boolean(session);

  // Logged-in users should not see the login page.
  if (isAuthed && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Public paths are always allowed through.
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!isAuthed) {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json(
        { error: "未登录或会话已过期" },
        { status: 401 }
      );
      if (token) res.cookies.delete(SESSION_COOKIE);
      return res;
    }
    const res = NextResponse.redirect(new URL("/login", req.url));
    if (token) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|woff2?|ttf)).*)",
  ],
};
