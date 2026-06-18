import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendNotification } from "@/lib/notification";

// POST /api/notifications/check-deadlines
// Scans all tasks with deadlines and sends reminders based on user's leadTimeMinutes.
// Idempotent within a small window — skips if a recent in_app reminder for the
// same task+user+type already exists.
export async function POST(_req: NextRequest) {
  const now = new Date();
  const sent: { taskId: string; userId: string; channels: string[] }[] = [];
  const errors: { taskId: string; error: string }[] = [];

  // Find all tasks that have a deadline AND are not yet done/closed
  const tasks = await db.task.findMany({
    where: {
      deadline: { not: null },
      status: { notIn: ["done", "closed"] },
    },
    include: {
      creator: true,
      assignee: true,
    },
  });

  for (const task of tasks) {
    if (!task.deadline) continue;
    // Build the list of stakeholders to notify (creator + assignee, deduped)
    const stakeholders = [task.creator, task.assignee].filter(
      (u): u is NonNullable<typeof u> => !!u
    );
    const seenUserIds = new Set<string>();
    for (const user of stakeholders) {
      if (seenUserIds.has(user.id)) continue;
      seenUserIds.add(user.id);

      const leadMs = (user.leadTimeMinutes ?? 60) * 60 * 1000;
      const reminderAt = new Date(task.deadline.getTime() - leadMs);

      // Send reminder if we're between reminderAt and deadline (or just past deadline)
      const isOverdue = task.deadline.getTime() < now.getTime();
      const isReminderWindow =
        reminderAt.getTime() <= now.getTime() &&
        task.deadline.getTime() > now.getTime();

      if (!isOverdue && !isReminderWindow) continue;

      // Idempotency: skip if we already sent a deadline_reminder in_app in the last 12 hours
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      const existing = await db.notification.findFirst({
        where: {
          userId: user.id,
          taskId: task.id,
          type: "deadline_reminder",
          channel: "in_app",
          createdAt: { gt: twelveHoursAgo },
        },
      });
      if (existing) continue;

      const title = isOverdue
        ? `任务已逾期：${task.title}`
        : `任务即将到期：${task.title}`;

      const content = isOverdue
        ? `任务【${task.title}】原定截止时间 ${task.deadline.toLocaleString(
            "zh-CN"
          )} 已逾期，请尽快处理。`
        : `任务【${task.title}】将在 ${task.deadline.toLocaleString(
            "zh-CN"
          )} 到期（提前 ${user.leadTimeMinutes} 分钟提醒），请关注进度。`;

      try {
        const results = await sendNotification({
          userId: user.id,
          taskId: task.id,
          type: "deadline_reminder",
          title,
          content,
        });
        sent.push({
          taskId: task.id,
          userId: user.id,
          channels: results.map((r) => r.channel),
        });
      } catch (e) {
        errors.push({
          taskId: task.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  return NextResponse.json({
    checkedTasks: tasks.length,
    sentCount: sent.length,
    errors,
    sent,
  });
}
