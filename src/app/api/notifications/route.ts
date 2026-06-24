import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import { getSessionUser, unauthorized } from "@/lib/auth";

// GET /api/notifications?unreadOnly=1
export async function GET(req: NextRequest) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const url = req.nextUrl;
  const unreadOnly = url.searchParams.get("unreadOnly") === "1";

  // 仅返回站内通道（in_app）的通知；email/feishu/wecom 等行只作为后台投递审计，不展示给用户
  const where: Record<string, unknown> = {
    userId: me.id,
    channel: "in_app",
  };
  if (unreadOnly) {
    where.OR = [{ status: "pending" }, { status: "sent" }];
  }

  const notifications = await db.notification.findMany({
    where,
    include: {
      task: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ notifications });
}
