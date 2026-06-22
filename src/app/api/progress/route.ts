import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import { normalizePercent, syncTaskProgress } from "@/lib/progress";

// GET /api/progress?taskId=...
export async function GET(req: NextRequest) {
  await ensureDatabaseSchema();

  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "缺少 taskId" }, { status: 400 });
  }
  const updates = await db.progressUpdate.findMany({
    where: { taskId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ updates });
}

// POST /api/progress  body: { taskId, userId, content?, percent? }
export async function POST(req: NextRequest) {
  await ensureDatabaseSchema();

  const body = await req.json();
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const percent = normalizePercent(body.percent);
  if (!body.taskId || !body.userId) {
    return NextResponse.json({ error: "缺少 taskId 或 userId" }, { status: 400 });
  }
  if (!content && percent === null) {
    return NextResponse.json(
      { error: "请填写进度说明或选择百分比" },
      { status: 400 }
    );
  }
  const user = await db.user.findFirst({
    where: { id: body.userId, deletedAt: null },
  });
  if (!user) {
    return NextResponse.json({ error: "操作人不存在或已删除" }, { status: 400 });
  }
  const task = await db.task.findUnique({ where: { id: body.taskId } });
  if (!task) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const update = await db.progressUpdate.create({
    data: {
      taskId: body.taskId,
      userId: body.userId,
      content,
      percent,
    },
    include: { user: true },
  });

  if (percent !== null) {
    await syncTaskProgress(body.taskId);
  }

  return NextResponse.json({ update });
}
