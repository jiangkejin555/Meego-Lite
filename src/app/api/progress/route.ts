import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import { normalizePercent, syncTaskProgress } from "@/lib/progress";
import { getSessionUser, getVisibleProjectIds, unauthorized } from "@/lib/auth";

// Whether the given task is visible to the user (creator or in a visible project)
async function isTaskVisible(
  taskId: string,
  meId: string,
  visibleProjectIds: string[]
): Promise<boolean> {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { creatorId: true, projectId: true },
  });
  if (!task) return false;
  return (
    task.creatorId === meId ||
    (!!task.projectId && visibleProjectIds.includes(task.projectId))
  );
}

// GET /api/progress?taskId=...
export async function GET(req: NextRequest) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "缺少 taskId" }, { status: 400 });
  }

  const visibleProjectIds = await getVisibleProjectIds(me.id);
  if (!(await isTaskVisible(taskId, me.id, visibleProjectIds))) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const updates = await db.progressUpdate.findMany({
    where: { taskId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ updates });
}

// POST /api/progress  body: { taskId, content?, percent? }
export async function POST(req: NextRequest) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const body = await req.json();
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const percent = normalizePercent(body.percent);
  if (!body.taskId) {
    return NextResponse.json({ error: "缺少 taskId" }, { status: 400 });
  }
  if (!content && percent === null) {
    return NextResponse.json(
      { error: "请填写进度说明或选择百分比" },
      { status: 400 }
    );
  }

  const visibleProjectIds = await getVisibleProjectIds(me.id);
  if (!(await isTaskVisible(body.taskId, me.id, visibleProjectIds))) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const update = await db.progressUpdate.create({
    data: {
      taskId: body.taskId,
      userId: me.id,
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
