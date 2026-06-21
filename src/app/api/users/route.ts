import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";

// GET /api/users
export async function GET() {
  await ensureDatabaseSchema();

  const users = await db.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      feishuId: true,
      wecomId: true,
      notifyEmail: true,
      notifyFeishu: true,
      notifyWeCom: true,
      feishuWebhook: true,
      wecomWebhook: true,
      leadTimeMinutes: true,
      deletedAt: true,
      createdAt: true,
      createdTasks: { select: { id: true, title: true } },
      assignedTasks: { select: { id: true, title: true } },
      ownedProjects: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({
    users: users.map(({ createdTasks, assignedTasks, ownedProjects, ...user }) => {
      const taskMap = new Map(
        [...createdTasks, ...assignedTasks].map((task) => [task.id, task])
      );
      const tasks = Array.from(taskMap.values());

      return {
        ...user,
        taskCount: tasks.length,
        taskTitles: tasks.map((task) => task.title),
        createdTaskTitles: createdTasks.map((task) => task.title),
        assignedTaskTitles: assignedTasks.map((task) => task.title),
        ownedProjectNames: ownedProjects.map((project) => project.name),
      };
    }),
  });
}

// POST /api/users
export async function POST(req: NextRequest) {
  await ensureDatabaseSchema();

  const body = await req.json();
  if (!body.name || !body.email) {
    return NextResponse.json(
      { error: "姓名和邮箱不能为空" },
      { status: 400 }
    );
  }
  const existing = await db.user.findUnique({
    where: { email: body.email },
  });
  if (existing && !existing.deletedAt) {
    return NextResponse.json({ error: "邮箱已存在" }, { status: 400 });
  }
  if (existing?.deletedAt) {
    await db.user.update({
      where: { id: existing.id },
      data: { email: `deleted-${existing.id}-${existing.email}` },
    });
  }
  const user = await db.user.create({
    data: {
      name: String(body.name).trim(),
      email: String(body.email).trim(),
      avatar: body.avatar || null,
      feishuId: body.feishuId || null,
      wecomId: body.wecomId || null,
      notifyEmail: body.notifyEmail ?? true,
      notifyFeishu: body.notifyFeishu ?? false,
      notifyWeCom: body.notifyWeCom ?? false,
      feishuWebhook: body.feishuWebhook || null,
      wecomWebhook: body.wecomWebhook || null,
      leadTimeMinutes: body.leadTimeMinutes ?? 60,
    },
  });
  return NextResponse.json({ user });
}
