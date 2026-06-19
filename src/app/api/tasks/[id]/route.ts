import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  parseStringArray,
  stringifyArray,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/constants";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/tasks/[id]
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const task = await db.task.findUnique({
    where: { id },
    include: {
      creator: true,
      assignee: true,
      project: { select: { id: true, name: true } },
      comments: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
      notifications: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });
  if (!task) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }
  return NextResponse.json({
    task: { ...task, tags: parseStringArray(task.tags) },
  });
}

// PUT /api/tasks/[id]
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const body = await req.json();

  const existing = await db.task.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.description !== undefined) data.description = body.description;
  if (body.status !== undefined) data.status = body.status as TaskStatus;
  if (body.priority !== undefined) data.priority = body.priority as TaskPriority;
  if (body.deadline !== undefined) {
    data.deadline = body.deadline ? new Date(body.deadline) : null;
  }
  if (body.progress !== undefined) data.progress = Number(body.progress);
  if (body.tags !== undefined) data.tags = stringifyArray(body.tags);
  if (body.estimatedHours !== undefined)
    data.estimatedHours = body.estimatedHours;
  if (body.actualHours !== undefined) data.actualHours = body.actualHours;
  if (body.assigneeId !== undefined) {
    if (body.assigneeId && body.assigneeId !== existing.assigneeId) {
      const assignee = await db.user.findFirst({
        where: { id: body.assigneeId, deletedAt: null },
      });
      if (!assignee) {
        return NextResponse.json(
          { error: "责任人不存在或已删除" },
          { status: 400 }
        );
      }
    }
    data.assigneeId = body.assigneeId || null;
  }
  if (body.projectId !== undefined)
    data.projectId = body.projectId || null;

  const task = await db.task.update({
    where: { id },
    data,
    include: { creator: true, assignee: true },
  });

  return NextResponse.json({
    task: { ...task, tags: parseStringArray(task.tags) },
  });
}

// DELETE /api/tasks/[id]
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const existing = await db.task.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  await db.$transaction([
    db.comment.deleteMany({ where: { taskId: id } }),
    db.notification.deleteMany({ where: { taskId: id } }),
    db.task.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
