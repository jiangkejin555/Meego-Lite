import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SESSION_COOKIE, clearSessionCookie, verifySession } from "@/lib/auth";

// POST /api/auth/logout — invalidate the session server-side and clear the cookie.
// Bumping sessionVersion kills the JWT immediately (getSessionUser will reject it),
// so even a still-valid cookie can no longer authenticate after logout.
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    const payload = await verifySession(token);
    if (payload) {
      await db.user
        .update({
          where: { id: payload.uid },
          data: { sessionVersion: { increment: 1 } },
        })
        .catch(() => {
          // user may already be deleted; clearing the cookie is enough
        });
    }
  }

  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
