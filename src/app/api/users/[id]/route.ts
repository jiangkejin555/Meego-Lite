import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import {
  SESSION_COOKIE,
  getSessionUser,
  hashPassword,
  sessionCookieOptions,
  unauthorized,
} from "@/lib/auth";
import { consumeVerificationCode } from "@/lib/verification";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PUT /api/users/[id] — personal settings: rename / notification prefs / change password
export async function PUT(req: NextRequest, ctx: RouteContext) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const { id } = await ctx.params;
  if (id !== me.id) {
    return NextResponse.json({ error: "只能修改自己的信息" }, { status: 403 });
  }

  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  // email is intentionally NOT updatable here (avoid breaking unique constraint & session)
  if (body.avatar !== undefined) data.avatar = body.avatar || null;
  if (body.feishuId !== undefined) data.feishuId = body.feishuId || null;
  if (body.wecomId !== undefined) data.wecomId = body.wecomId || null;
  if (body.notifyEmail !== undefined) data.notifyEmail = !!body.notifyEmail;
  if (body.notifyFeishu !== undefined) data.notifyFeishu = !!body.notifyFeishu;
  if (body.notifyWeCom !== undefined) data.notifyWeCom = !!body.notifyWeCom;
  if (body.feishuWebhook !== undefined)
    data.feishuWebhook = body.feishuWebhook || null;
  if (body.wecomWebhook !== undefined)
    data.wecomWebhook = body.wecomWebhook || null;
  if (body.leadTimeMinutes !== undefined)
    data.leadTimeMinutes = Number(body.leadTimeMinutes);

  // Optional password change — verified via email code (no current password needed)
  if (body.newPassword !== undefined || body.code !== undefined) {
    const newPassword = String(body.newPassword ?? "");
    const code = String(body.code ?? "").trim();
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "新密码长度至少 6 位" },
        { status: 400 }
      );
    }
    if (!code) {
      return NextResponse.json({ error: "请输入邮箱验证码" }, { status: 400 });
    }
    const ok = await consumeVerificationCode(me.email, code, "reset_password");
    if (!ok) {
      return NextResponse.json(
        { error: "验证码无效或已过期" },
        { status: 400 }
      );
    }
    data.passwordHash = await hashPassword(newPassword);
  }

  const user = await db.user.update({ where: { id: me.id }, data });
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      feishuId: user.feishuId,
      wecomId: user.wecomId,
      notifyEmail: user.notifyEmail,
      notifyFeishu: user.notifyFeishu,
      notifyWeCom: user.notifyWeCom,
      feishuWebhook: user.feishuWebhook,
      wecomWebhook: user.wecomWebhook,
      leadTimeMinutes: user.leadTimeMinutes,
    },
  });
}

// DELETE /api/users/[id] — account cancellation (hard delete), self only
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const { id } = await ctx.params;
  if (id !== me.id) {
    return NextResponse.json({ error: "只能注销自己的账号" }, { status: 403 });
  }

  // Must not own any created projects or tasks (Task.creator is RESTRICT)
  const projectCount = await db.project.count({
    where: { creatorId: me.id },
  });
  const taskCount = await db.task.count({ where: { creatorId: me.id } });
  if (projectCount > 0 || taskCount > 0) {
    return NextResponse.json(
      { error: "请先删除你创建的项目和任务后再注销" },
      { status: 400 }
    );
  }

  // Hard delete in a transaction. Order: remove RESTRICT-bound dependents first,
  // unbind assignee, then delete the user (cascades owners & notifications).
  await db.$transaction([
    db.comment.deleteMany({ where: { userId: me.id } }),
    db.progressUpdate.deleteMany({ where: { userId: me.id } }),
    db.notification.deleteMany({ where: { userId: me.id } }),
    db.task.updateMany({
      where: { assigneeId: me.id },
      data: { assigneeId: null },
    }),
    db.user.delete({ where: { id: me.id } }),
  ]);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  return res;
}
