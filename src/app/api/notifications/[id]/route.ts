import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/notifications/[id] — mark as read
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (body.read) {
    data.status = "read";
    data.readAt = new Date();
  }

  const notif = await db.notification.update({
    where: { id },
    data,
  });
  return NextResponse.json({ notification: notif });
}
