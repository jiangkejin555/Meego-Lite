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

  const where: Record<string, unknown> = { userId: me.id };
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
