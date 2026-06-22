import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  parseStringArray,
  stringifyArray,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/constants";
import { sendNotification } from "@/lib/notification";
import { ensureDatabaseSchema } from "@/lib/db-migrations";

// GET /api/tasks — list with optional filters
export async function GET(req: NextRequest) {
  await ensureDatabaseSchema();

  const url = req.nextUrl;
  const status = url.searchParams.get("status") || undefined;
  const priority = url.searchParams.get("priority") || undefined;
  const assigneeId = url.searchParams.get("assigneeId") || undefined;
  const creatorId = url.searchParams.get("creatorId") || undefined;
  const projectId = url.searchParams.get("projectId") || undefined;
  const search = url.searchParams.get("search") || undefined;
  const tag = url.searchParams.get("tag") || undefined;
  const mine = url.searchParams.get("mine"); // current user id

  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  if (priority && priority !== "all") where.priority = priority;
  if (assigneeId && assigneeId !== "all") where.assigneeId = assigneeId;
  if (creatorId && creatorId !== "all") where.creatorId = creatorId;
  if (projectId && projectId !== "all") {
    where.projectId = projectId === "none" ? null : projectId;
  }
  if (tag && tag !== "all") where.tags = { contains: JSON.stringify(tag) };
  if (mine) {
    where.OR = [{ assigneeId: mine }, { creatorId: mine }];
  }
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const tasks = await db.task.findMany({
    where,
    include: {
      creator: true,
      assignee: true,
      project: { select: { id: true, name: true } },
      progressUpdates: {
        where: { content: { not: "" } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, percent: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Parse tags and surface the latest progress description (only entries with content)
  const result = tasks.map(({ progressUpdates, ...t }) => {
    const latest = progressUpdates[0];
    return {
      ...t,
      tags: parseStringArray(t.tags),
      latestProgressNote: latest?.content ?? null,
      latestProgressPercent: latest?.percent ?? null,
    };
  });

  return NextResponse.json({ tasks: result });
}

// POST /api/tasks — create a new task
export async function POST(req: NextRequest) {
  await ensureDatabaseSchema();

  const body = await req.json();

  // Basic validation
  if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json(
      { error: "任务名称不能为空" },
      { status: 400 }
    );
  }
  if (!body.creatorId) {
    return NextResponse.json(
      { error: "创建人不能为空" },
      { status: 400 }
    );
  }
  const creator = await db.user.findFirst({
    where: { id: body.creatorId, deletedAt: null },
  });
  if (!creator) {
    return NextResponse.json(
      { error: "创建人不存在或已删除" },
      { status: 400 }
    );
  }
  if (body.assigneeId) {
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

  const task = await db.task.create({
    data: {
      title: body.title.trim(),
      description: body.description ?? null,
      status: (body.status as TaskStatus) || "todo",
      priority: (body.priority as TaskPriority) || "p2",
      deadline: body.deadline ? new Date(body.deadline) : null,
      progress: typeof body.progress === "number" ? body.progress : 0,
      tags: body.tags ? stringifyArray(body.tags) : null,
      estimatedHours:
        typeof body.estimatedHours === "number" ? body.estimatedHours : null,
      actualHours:
        typeof body.actualHours === "number" ? body.actualHours : null,
      creatorId: body.creatorId,
      assigneeId: body.assigneeId || null,
      projectId: body.projectId || null,
    },
    include: { creator: true, assignee: true },
  });

  // If assignee is set and is not the creator, notify the assignee
  if (task.assigneeId && task.assigneeId !== task.creatorId) {
    await sendNotification({
      userId: task.assigneeId,
      taskId: task.id,
      type: "assignment",
      title: "新任务分配给你",
      content: `【${task.title}】已分配给你，优先级：${task.priority}，截止时间：${
        task.deadline ? new Date(task.deadline).toLocaleString("zh-CN") : "未设置"
      }`,
    });
  }

  return NextResponse.json({
    task: { ...task, tags: parseStringArray(task.tags) },
  });
}
