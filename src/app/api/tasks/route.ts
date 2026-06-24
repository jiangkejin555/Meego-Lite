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
import { getSessionUser, getVisibleProjectIds, unauthorized } from "@/lib/auth";
import {
  buildTaskCreatedProgressContent,
  createTaskProgressUpdate,
} from "@/lib/progress";

// GET /api/tasks — list with optional filters
export async function GET(req: NextRequest) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const url = req.nextUrl;
  const status = url.searchParams.get("status") || undefined;
  const priority = url.searchParams.get("priority") || undefined;
  const assigneeId = url.searchParams.get("assigneeId") || undefined;
  // creatorId is accepted only as an extra filter — never as a权限边界.
  const creatorId = url.searchParams.get("creatorId") || undefined;
  const projectId = url.searchParams.get("projectId") || undefined;
  const search = url.searchParams.get("search") || undefined;
  const tag = url.searchParams.get("tag") || undefined;

  // A task is visible if I created it (incl. project-less tasks) or it belongs
  // to a project I can see.
  const visibleProjectIds = await getVisibleProjectIds(me.id);
  const visibility = {
    OR: [{ creatorId: me.id }, { projectId: { in: visibleProjectIds } }],
  };

  // Combine visibility with the other filters via AND so that the search OR
  // can never override the visibility OR.
  const andConditions: Record<string, unknown>[] = [visibility];
  if (status && status !== "all") andConditions.push({ status });
  if (priority && priority !== "all") andConditions.push({ priority });
  if (assigneeId && assigneeId !== "all") andConditions.push({ assigneeId });
  if (creatorId && creatorId !== "all") andConditions.push({ creatorId });
  if (projectId && projectId !== "all") {
    andConditions.push({ projectId: projectId === "none" ? null : projectId });
  }
  if (tag && tag !== "all") {
    andConditions.push({ tags: { contains: JSON.stringify(tag) } });
  }
  if (search) {
    andConditions.push({
      OR: [
        { title: { contains: search } },
        { description: { contains: search } },
      ],
    });
  }

  const tasks = await db.task.findMany({
    where: { AND: andConditions },
    include: {
      creator: true,
      assignee: true,
      project: { select: { id: true, name: true } },
      progressUpdates: {
        where: { content: { not: "" } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true },
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
    };
  });

  return NextResponse.json({ tasks: result });
}

// POST /api/tasks — create a new task
export async function POST(req: NextRequest) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const body = await req.json();

  // Basic validation
  if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json(
      { error: "任务名称不能为空" },
      { status: 400 }
    );
  }

  const projectId: string | null = body.projectId || null;

  // If a project is specified, it must be visible to me.
  if (projectId) {
    const visibleProjectIds = await getVisibleProjectIds(me.id);
    if (!visibleProjectIds.includes(projectId)) {
      return NextResponse.json(
        { error: "无权在该项目下创建任务" },
        { status: 400 }
      );
    }
  }

  // Validate the assignee against the assignment scope.
  const assigneeId: string | null = body.assigneeId || null;
  if (assigneeId) {
    if (projectId) {
      const project = await db.project.findUnique({
        where: { id: projectId },
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

  const status = (body.status as TaskStatus) || "todo";

  const task = await db.$transaction(async (tx) => {
    const createdTask = await tx.task.create({
      data: {
        title: body.title.trim(),
        description: body.description ?? null,
        status,
        priority: (body.priority as TaskPriority) || "p2",
        deadline: body.deadline ? new Date(body.deadline) : null,
        tags: body.tags ? stringifyArray(body.tags) : null,
        estimatedHours:
          typeof body.estimatedHours === "number" ? body.estimatedHours : null,
        actualHours:
          typeof body.actualHours === "number" ? body.actualHours : null,
        creatorId: me.id,
        assigneeId,
        projectId,
      },
      include: { creator: true, assignee: true },
    });

    await createTaskProgressUpdate(tx, {
      taskId: createdTask.id,
      userId: me.id,
      status,
      content: buildTaskCreatedProgressContent(),
    });

    return createdTask;
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
