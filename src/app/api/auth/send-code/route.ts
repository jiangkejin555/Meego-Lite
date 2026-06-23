import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import { sendEmail } from "@/lib/notification";
import { createLogger } from "@/lib/logger";

const log = createLogger("send-code");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// POST /api/auth/send-code — issue a verification code via email
export async function POST(req: NextRequest) {
  await ensureDatabaseSchema();

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const purpose = body?.purpose;

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
  }
  if (
    purpose !== "register" &&
    purpose !== "login" &&
    purpose !== "reset_password"
  ) {
    return NextResponse.json({ error: "验证码用途无效" }, { status: 400 });
  }

  log.info("收到验证码请求", { email, purpose });

  // Rate limit: at most one code per email+purpose every 60 seconds.
  const last = await db.verificationCode.findFirst({
    where: { email, purpose },
    orderBy: { createdAt: "desc" },
  });
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    log.warn("命中限流，拒绝发送", { email, purpose });
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试" },
      { status: 429 }
    );
  }

  const existingUser = await db.user.findFirst({
    where: { email, deletedAt: null },
  });

  if (purpose === "register" && existingUser) {
    return NextResponse.json({ error: "邮箱已被注册" }, { status: 400 });
  }
  if (
    (purpose === "login" || purpose === "reset_password") &&
    !existingUser
  ) {
    return NextResponse.json({ error: "该邮箱未注册" }, { status: 400 });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await db.verificationCode.create({
    data: {
      email,
      code,
      purpose,
      expiresAt,
      consumed: false,
    },
  });

  const result = await sendEmail(
    email,
    "【Meego Lite】验证码",
    `您的验证码是 ${code}，10 分钟内有效。如非本人操作请忽略。`
  );

  if (!result.ok) {
    log.error("验证码邮件发送失败", {
      email,
      purpose,
      error: result.error,
    });
    return NextResponse.json(
      { error: "验证码邮件发送失败，请检查邮箱地址或稍后再试" },
      { status: 500 }
    );
  }

  log.info("验证码已发送", { email, purpose });
  return NextResponse.json({ ok: true });
}
