import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, unauthorized } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/notifications/[id] — mark as read
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (body.read) {
    data.status = "read";
    data.readAt = new Date();
  }

  const existing = await db.notification.findUnique({ where: { id } });
  if (!existing || existing.userId !== me.id) {
    return NextResponse.json({ error: "通知不存在" }, { status: 404 });
  }

  const notif = await db.notification.update({
    where: { id },
    data,
  });
  return NextResponse.json({ notification: notif });
}
