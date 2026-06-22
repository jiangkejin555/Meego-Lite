import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import { getSessionUser, unauthorized } from "@/lib/auth";

// GET /api/users — active user candidates for project authorization / task assignment
export async function GET(req: NextRequest) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const users = await db.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
    },
  });
  return NextResponse.json({ users });
}

// POST /api/users — disabled; account creation goes through the registration flow
export async function POST() {
  return NextResponse.json(
    { error: "请通过注册流程创建账号" },
    { status: 405 }
  );
}
