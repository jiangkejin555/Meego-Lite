// Task / Requirement management constants

export type TaskType = "requirement" | "task" | "bug";
export type TaskStatus = "todo" | "in_progress" | "testing" | "done" | "closed";
export type TaskPriority = "p0" | "p1" | "p2" | "p3";
export type NotificationChannel = "in_app" | "email" | "feishu" | "wecom";
export type NotificationType =
  | "deadline_reminder"
  | "assignment"
  | "status_change"
  | "mention"
  | "comment";

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  requirement: "需求",
  task: "任务",
  bug: "缺陷",
};

export const TASK_TYPE_COLOR: Record<TaskType, string> = {
  requirement: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  task: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  bug: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "待开始",
  in_progress: "进行中",
  testing: "测试中",
  done: "已完成",
  closed: "已关闭",
};

export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  testing: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  closed: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
};

export const TASK_STATUS_ORDER: TaskStatus[] = [
  "todo",
  "in_progress",
  "testing",
  "done",
  "closed",
];

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  p0: "P0 紧急",
  p1: "P1 高",
  p2: "P2 中",
  p3: "P3 低",
};

export const TASK_PRIORITY_COLOR: Record<TaskPriority, string> = {
  p0: "bg-rose-500 text-white",
  p1: "bg-orange-500 text-white",
  p2: "bg-amber-400 text-amber-950",
  p3: "bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
};

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  deadline_reminder: "截止提醒",
  assignment: "任务分配",
  status_change: "状态变更",
  mention: "提及",
  comment: "新评论",
};

export const NOTIFICATION_CHANNEL_LABEL: Record<NotificationChannel, string> = {
  in_app: "站内",
  email: "邮件",
  feishu: "飞书",
  wecom: "企业微信",
};

export const NOTIFICATION_STATUS_LABEL: Record<string, string> = {
  pending: "待发送",
  sent: "已发送",
  failed: "失败",
  read: "已读",
};

// Helper to safely parse JSON string arrays stored in DB
export function parseStringArray(s?: string | null): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function stringifyArray(arr: string[]): string {
  return JSON.stringify(arr || []);
}
