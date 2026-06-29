import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, unauthorized } from "@/lib/auth";

// POST /api/notifications/mark-all-read
export async function POST(req: NextRequest) {
  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  // Mark all in-app notifications of this user as read
  await db.notification.updateMany({
    where: {
      userId: me.id,
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
