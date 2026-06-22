import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendNotification } from "@/lib/notification";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
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

// GET /api/comments?taskId=...
export async function GET(req: NextRequest) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const url = req.nextUrl;
  const taskId = url.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "缺少 taskId" }, { status: 400 });
  }

  const visibleProjectIds = await getVisibleProjectIds(me.id);
  if (!(await isTaskVisible(taskId, me.id, visibleProjectIds))) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const comments = await db.comment.findMany({
    where: { taskId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ comments });
}

// POST /api/comments  body: { taskId, content }
export async function POST(req: NextRequest) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const body = await req.json();
  if (!body.taskId || !body.content?.trim()) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }
  const content = String(body.content).trim();

  const visibleProjectIds = await getVisibleProjectIds(me.id);
  if (!(await isTaskVisible(body.taskId, me.id, visibleProjectIds))) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const comment = await db.comment.create({
    data: {
      taskId: body.taskId,
      userId: me.id,
      content,
    },
    include: { user: true },
  });

  // 触发评论通知：通知任务的 创建人 + 负责人（包含评论者本人，去重避免双发）
  try {
    const task = await db.task.findUnique({
      where: { id: body.taskId },
      include: { creator: true, assignee: true },
    });
    if (task) {
      const stakeholders = [task.creator, task.assignee].filter(
        (u): u is NonNullable<typeof u> => !!u
      );
      const seen = new Set<string>();
      const preview = content.length > 120 ? content.slice(0, 120) + "…" : content;
      const title = `${comment.user.name} 评论了任务：${task.title}`;
      const text = `${comment.user.name} 在任务【${task.title}】中评论：\n${preview}`;
      await Promise.all(
        stakeholders
          .filter((u) => {
            if (seen.has(u.id)) return false;
            seen.add(u.id);
            return true;
          })
          .map((u) =>
            sendNotification({
              userId: u.id,
              taskId: task.id,
              type: "comment",
              title,
              content: text,
            })
          )
      );
    }
  } catch (e) {
    // 通知失败不影响评论本身写入
    console.error("[comment notify] failed:", e);
  }

  return NextResponse.json({ comment });
}
