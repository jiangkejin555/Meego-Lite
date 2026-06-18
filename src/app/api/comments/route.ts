import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendNotification } from "@/lib/notification";

// GET /api/comments?taskId=...
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const taskId = url.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "缺少 taskId" }, { status: 400 });
  }
  const comments = await db.comment.findMany({
    where: { taskId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ comments });
}

// POST /api/comments  body: { taskId, userId, content }
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.taskId || !body.userId || !body.content?.trim()) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }
  const content = String(body.content).trim();
  const comment = await db.comment.create({
    data: {
      taskId: body.taskId,
      userId: body.userId,
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
