import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, clearSessionCookie, verifySession } from "@/lib/auth";

const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/send-code",
  "/api/auth/logout",
]);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  const isAuthed = Boolean(session);

  // NOTE: middleware runs on the edge and can only do a stateless JWT check
  // (verifySession), not the DB-backed sessionVersion check. We deliberately do
  // NOT redirect an "authed" visitor away from /login here: after logout or an
  // SSO kick the JWT can still be signature-valid while the session is already
  // invalidated server-side, and bouncing /login -> / would trap the user on a
  // page that immediately fails /api/auth/me. The login page itself redirects
  // home after a successful login, so this cosmetic guard is unnecessary.

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
      clearSessionCookie(res, req);
      return res;
    }
    const res = NextResponse.redirect(new URL("/login", req.url));
    clearSessionCookie(res, req);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|woff2?|ttf)).*)",
  ],
};
