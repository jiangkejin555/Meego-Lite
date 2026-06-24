import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import { createTaskProgressUpdate } from "@/lib/progress";
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

// POST /api/progress  body: { taskId, content }
export async function POST(req: NextRequest) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const body = await req.json();
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!body.taskId) {
    return NextResponse.json({ error: "缺少 taskId" }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "请填写进度描述" }, { status: 400 });
  }

  const visibleProjectIds = await getVisibleProjectIds(me.id);
  if (!(await isTaskVisible(body.taskId, me.id, visibleProjectIds))) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const task = await db.task.findUnique({
    where: { id: body.taskId },
    select: { status: true },
  });
  if (!task) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const created = await createTaskProgressUpdate(db, {
    taskId: body.taskId,
    userId: me.id,
    status: task.status as
      | "todo"
      | "in_progress"
      | "paused"
      | "done"
      | "closed",
    content,
  });

  const update = await db.progressUpdate.findUnique({
    where: { id: (created as { id: string }).id },
    include: { user: true },
  });

  return NextResponse.json({ update });
}
