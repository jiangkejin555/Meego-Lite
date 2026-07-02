import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import {
  hashPassword,
  setSessionCookie,
  signSession,
} from "@/lib/auth";
import { consumeVerificationCode } from "@/lib/verification";
import { createLogger } from "@/lib/logger";

const log = createLogger("register");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const CODE_REGEX = /^\d{6}$/;

// POST /api/auth/register — create an account with an email verification code
export async function POST(req: NextRequest) {
  await ensureDatabaseSchema();

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "姓名不能为空" }, { status: 400 });
  }
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: "密码长度至少为 6 位" },
      { status: 400 }
    );
  }
  if (!CODE_REGEX.test(code)) {
    return NextResponse.json({ error: "验证码格式不正确" }, { status: 400 });
  }

  const existingUser = await db.user.findFirst({
    where: { email, deletedAt: null },
  });
  if (existingUser) {
    log.warn("注册失败：邮箱已被注册", { email });
    return NextResponse.json({ error: "邮箱已被注册" }, { status: 400 });
  }

  const valid = await consumeVerificationCode(email, code, "register");
  if (!valid) {
    log.warn("注册失败：验证码无效或已过期", { email });
    return NextResponse.json(
      { error: "验证码无效或已过期" },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { name, email, passwordHash, sessionVersion: 1 },
  });

  const token = await signSession({
    uid: user.id,
    email: user.email,
    sv: user.sessionVersion,
  });

  const { passwordHash: _omit, ...safeUser } = user;
  void _omit;

  log.info("注册成功", { email, userId: user.id });
  const res = NextResponse.json({ user: safeUser });
  setSessionCookie(res, req, token);
  return res;
}
