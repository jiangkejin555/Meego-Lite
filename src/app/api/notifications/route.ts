import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/notifications?userId=...&unreadOnly=1
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const userId = url.searchParams.get("userId");
  const unreadOnly = url.searchParams.get("unreadOnly") === "1";

  if (!userId) {
    return NextResponse.json(
      { error: "缺少 userId 参数" },
      { status: 400 }
    );
  }

  const where: Record<string, unknown> = { userId };
  if (unreadOnly) {
    where.AND = [
      { channel: "in_app" },
      {
        OR: [{ status: "pending" }, { status: "sent" }],
      },
    ];
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
