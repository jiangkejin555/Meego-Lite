import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  parseStringArray,
  stringifyArray,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/constants";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import { getSessionUser, getVisibleProjectIds, unauthorized } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/tasks/[id]
export async function GET(req: NextRequest, ctx: RouteContext) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

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
      progressUpdates: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
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

  const visibleProjectIds = await getVisibleProjectIds(me.id);
  const isVisible =
    task.creatorId === me.id ||
    (task.projectId !== null && visibleProjectIds.includes(task.projectId));
  if (!isVisible) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  return NextResponse.json({
    task: { ...task, tags: parseStringArray(task.tags) },
  });
}

// PUT /api/tasks/[id]
export async function PUT(req: NextRequest, ctx: RouteContext) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const { id } = await ctx.params;
  const body = await req.json();

  const existing = await db.task.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const visibleProjectIds = await getVisibleProjectIds(me.id);
  const isVisible =
    existing.creatorId === me.id ||
    (existing.projectId !== null &&
      visibleProjectIds.includes(existing.projectId));
  if (!isVisible) {
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

  // Determine the final projectId (after this update) for assignment scope checks.
  const projectIdProvided = body.projectId !== undefined;
  const finalProjectId: string | null = projectIdProvided
    ? body.projectId || null
    : existing.projectId;

  // If the project is being changed, the new project must be visible to me.
  if (projectIdProvided) {
    if (finalProjectId && !visibleProjectIds.includes(finalProjectId)) {
      return NextResponse.json(
        { error: "无权在该项目下创建任务" },
        { status: 400 }
      );
    }
    data.projectId = finalProjectId;
  }

  if (body.assigneeId !== undefined) {
    const assigneeId: string | null = body.assigneeId || null;
    if (assigneeId) {
      if (finalProjectId) {
        const project = await db.project.findUnique({
          where: { id: finalProjectId },
          include: { owners: { select: { id: true } } },
        });
        const allowed = new Set<string>(project?.owners.map((o) => o.id) ?? []);
        if (project?.creatorId) allowed.add(project.creatorId);
        if (!allowed.has(assigneeId)) {
          return NextResponse.json(
            { error: "只能指派给该项目的授权成员" },
            { status: 400 }
          );
        }
      } else if (assigneeId !== me.id) {
        return NextResponse.json(
          { error: "无项目任务只能指派给自己" },
          { status: 400 }
        );
      }
    }
    data.assigneeId = assigneeId;
  }

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
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const { id } = await ctx.params;
  const existing = await db.task.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const visibleProjectIds = await getVisibleProjectIds(me.id);
  const isVisible =
    existing.creatorId === me.id ||
    (existing.projectId !== null &&
      visibleProjectIds.includes(existing.projectId));
  if (!isVisible) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  await db.$transaction([
    db.comment.deleteMany({ where: { taskId: id } }),
    db.progressUpdate.deleteMany({ where: { taskId: id } }),
    db.notification.deleteMany({ where: { taskId: id } }),
    db.task.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
