import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import { getSessionUser, getVisibleProjectIds, unauthorized } from "@/lib/auth";

// GET /api/stats — aggregates over the tasks/projects visible to the current user
export async function GET(req: NextRequest) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const visibleProjectIds = await getVisibleProjectIds(me.id);
  // A task is visible if the user created it or it belongs to a visible project.
  const taskVisible = {
    OR: [{ creatorId: me.id }, { projectId: { in: visibleProjectIds } }],
  };

  const [
    total,
    todoCount,
    inProgressCount,
    pausedCount,
    doneCount,
    closedCount,
    p0Count,
    p1Count,
    p2Count,
    p3Count,
    overdueCount,
    dueSoonCount,
  ] = await Promise.all([
    db.task.count({ where: taskVisible }),
    db.task.count({ where: { AND: [taskVisible, { status: "todo" }] } }),
    db.task.count({ where: { AND: [taskVisible, { status: "in_progress" }] } }),
    db.task.count({ where: { AND: [taskVisible, { status: "paused" }] } }),
    db.task.count({ where: { AND: [taskVisible, { status: "done" }] } }),
    db.task.count({ where: { AND: [taskVisible, { status: "closed" }] } }),
    db.task.count({ where: { AND: [taskVisible, { priority: "p0" }] } }),
    db.task.count({ where: { AND: [taskVisible, { priority: "p1" }] } }),
    db.task.count({ where: { AND: [taskVisible, { priority: "p2" }] } }),
    db.task.count({ where: { AND: [taskVisible, { priority: "p3" }] } }),
    // Overdue: deadline < now and status not in done/closed
    db.task.count({
      where: {
        AND: [
          taskVisible,
          {
            deadline: { lt: new Date() },
            status: { notIn: ["done", "closed"] },
          },
        ],
      },
    }),
    // Due soon: deadline within 24h and status not in done/closed
    db.task.count({
      where: {
        AND: [
          taskVisible,
          {
            deadline: {
              gte: new Date(),
              lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
            status: { notIn: ["done", "closed"] },
          },
        ],
      },
    }),
  ]);

  // Personal stats (based on assigneeId === me.id)
  const myOpenCount = await db.task.count({
    where: {
      assigneeId: me.id,
      status: { notIn: ["done", "closed"] },
    },
  });
  const myOverdueCount = await db.task.count({
    where: {
      assigneeId: me.id,
      deadline: { lt: new Date() },
      status: { notIn: ["done", "closed"] },
    },
  });

  // Upcoming deadlines (next 5)
  const upcoming = await db.task.findMany({
    where: {
      AND: [
        taskVisible,
        {
          deadline: { gte: new Date() },
          status: { notIn: ["done", "closed"] },
        },
      ],
    },
    include: { assignee: true },
    orderBy: { deadline: "asc" },
    take: 5,
  });

  // Recently overdue (5)
  const recentlyOverdue = await db.task.findMany({
    where: {
      AND: [
        taskVisible,
        {
          deadline: { lt: new Date() },
          status: { notIn: ["done", "closed"] },
        },
      ],
    },
    include: { assignee: true },
    orderBy: { deadline: "asc" },
    take: 5,
  });

  // Project stats — only projects visible to the current user
  const projectVisible = {
    OR: [{ creatorId: me.id }, { owners: { some: { id: me.id } } }],
  };
  const [
    projectTotal,
    projectNotStarted,
    projectInProgress,
    projectDone,
    projectPaused,
  ] = await Promise.all([
    db.project.count({ where: projectVisible }),
    db.project.count({
      where: { AND: [projectVisible, { status: "not_started" }] },
    }),
    db.project.count({
      where: { AND: [projectVisible, { status: "in_progress" }] },
    }),
    db.project.count({ where: { AND: [projectVisible, { status: "done" }] } }),
    db.project.count({ where: { AND: [projectVisible, { status: "paused" }] } }),
  ]);

  return NextResponse.json({
    status: {
      todo: todoCount,
      in_progress: inProgressCount,
      paused: pausedCount,
      done: doneCount,
      closed: closedCount,
    },
    priority: {
      p0: p0Count,
      p1: p1Count,
      p2: p2Count,
      p3: p3Count,
    },
    project: {
      total: projectTotal,
      not_started: projectNotStarted,
      in_progress: projectInProgress,
      done: projectDone,
      paused: projectPaused,
    },
    total,
    overdueCount,
    dueSoonCount,
    myOpenCount,
    myOverdueCount,
    upcoming,
    recentlyOverdue,
  });
}
