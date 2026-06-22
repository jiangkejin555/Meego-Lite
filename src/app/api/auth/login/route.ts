import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  verifyPassword,
} from "@/lib/auth";
import { consumeVerificationCode } from "@/lib/verification";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function invalidCredentials() {
  return NextResponse.json({ error: "邮箱或凭据无效" }, { status: 401 });
}

// POST /api/auth/login — authenticate via password or verification code
export async function POST(req: NextRequest) {
  await ensureDatabaseSchema();

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const mode = body?.mode;

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
  }
  if (mode !== "password" && mode !== "code") {
    return NextResponse.json({ error: "登录方式无效" }, { status: 400 });
  }

  const user = await db.user.findFirst({
    where: { email, deletedAt: null },
  });

  if (mode === "password") {
    const password = typeof body?.password === "string" ? body.password : "";
    if (!user || !user.passwordHash) {
      return invalidCredentials();
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return invalidCredentials();
    }
  } else {
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!user) {
      return invalidCredentials();
    }
    const valid = await consumeVerificationCode(email, code, "login");
    if (!valid) {
      return invalidCredentials();
    }
  }

  const token = await signSession({ uid: user.id, email: user.email });

  const { passwordHash: _omit, ...safeUser } = user;
  void _omit;

  const res = NextResponse.json({ user: safeUser });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
