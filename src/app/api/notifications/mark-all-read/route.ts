import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/notifications/mark-all-read
// body: { userId: string }
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.userId) {
    return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  }

  // Mark all in-app notifications of this user as read
  await db.notification.updateMany({
    where: {
      userId: body.userId,
      channel: "in_app",
      status: { in: ["pending", "sent"] },
    },
    data: {
      status: "read",
      readAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
