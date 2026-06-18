import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/stats?userId=...  (userId optional — if provided, returns personal stats too)
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const userId = url.searchParams.get("userId") || undefined;

  const [
    total,
    todoCount,
    inProgressCount,
    testingCount,
    doneCount,
    closedCount,
    p0Count,
    p1Count,
    p2Count,
    p3Count,
    requirementCount,
    taskCount,
    bugCount,
    overdueCount,
    dueSoonCount,
  ] = await Promise.all([
    db.task.count(),
    db.task.count({ where: { status: "todo" } }),
    db.task.count({ where: { status: "in_progress" } }),
    db.task.count({ where: { status: "testing" } }),
    db.task.count({ where: { status: "done" } }),
    db.task.count({ where: { status: "closed" } }),
    db.task.count({ where: { priority: "p0" } }),
    db.task.count({ where: { priority: "p1" } }),
    db.task.count({ where: { priority: "p2" } }),
    db.task.count({ where: { priority: "p3" } }),
    db.task.count({ where: { type: "requirement" } }),
    db.task.count({ where: { type: "task" } }),
    db.task.count({ where: { type: "bug" } }),
    // Overdue: deadline < now and status not in done/closed
    db.task.count({
      where: {
        deadline: { lt: new Date() },
        status: { notIn: ["done", "closed"] },
      },
    }),
    // Due soon: deadline within 24h and status not in done/closed
    db.task.count({
      where: {
        deadline: {
          gte: new Date(),
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        status: { notIn: ["done", "closed"] },
      },
    }),
  ]);

  // Personal stats
  let myOpenCount = 0;
  let myOverdueCount = 0;
  if (userId) {
    myOpenCount = await db.task.count({
      where: {
        assigneeId: userId,
        status: { notIn: ["done", "closed"] },
      },
    });
    myOverdueCount = await db.task.count({
      where: {
        assigneeId: userId,
        deadline: { lt: new Date() },
        status: { notIn: ["done", "closed"] },
      },
    });
  }

  // Upcoming deadlines (next 5)
  const upcoming = await db.task.findMany({
    where: {
      deadline: { gte: new Date() },
      status: { notIn: ["done", "closed"] },
    },
    include: { assignee: true },
    orderBy: { deadline: "asc" },
    take: 5,
  });

  // Recently overdue (5)
  const recentlyOverdue = await db.task.findMany({
    where: {
      deadline: { lt: new Date() },
      status: { notIn: ["done", "closed"] },
    },
    include: { assignee: true },
    orderBy: { deadline: "asc" },
    take: 5,
  });

  return NextResponse.json({
    status: {
      todo: todoCount,
      in_progress: inProgressCount,
      testing: testingCount,
      done: doneCount,
      closed: closedCount,
    },
    priority: {
      p0: p0Count,
      p1: p1Count,
      p2: p2Count,
      p3: p3Count,
    },
    type: {
      requirement: requirementCount,
      task: taskCount,
      bug: bugCount,
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
