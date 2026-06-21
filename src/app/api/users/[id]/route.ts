import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PUT /api/users/[id] — update notification settings etc.
export async function PUT(req: NextRequest, ctx: RouteContext) {
  await ensureDatabaseSchema();

  const { id } = await ctx.params;
  const body = await req.json();

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.email !== undefined) data.email = String(body.email).trim();
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

  const user = await db.user.update({ where: { id }, data });
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

// DELETE /api/users/[id]
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  await ensureDatabaseSchema();

  const { id } = await ctx.params;

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  await db.user.update({
    where: { id },
    data: {
      email: `deleted-${id}-${existing.email}`,
      deletedAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true });
}
