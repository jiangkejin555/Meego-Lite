// Task / Requirement management constants

export type TaskStatus = "todo" | "in_progress" | "paused" | "done" | "closed";
export type TaskPriority = "p0" | "p1" | "p2" | "p3";
export type ProjectStatus = "not_started" | "in_progress" | "done" | "paused";
export type ProjectPriority = "p0" | "p1" | "p2" | "p3";
export type NotificationChannel = "in_app" | "email" | "feishu" | "wecom";
export type NotificationType =
  | "deadline_reminder"
  | "assignment"
  | "status_change"
  | "mention"
  | "comment";

// Preset palette for tags. Tags map to a color by a stable hash of their name;
// when there are more distinct tags than colors, colors repeat (modulo).
export const TAG_COLORS: string[] = [
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  "bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
];

export function tagColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return TAG_COLORS[hash % TAG_COLORS.length];
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "待开始",
  in_progress: "进行中",
  paused: "已暂停",
  done: "已完成",
  closed: "已关闭",
};

export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  paused: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  closed: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
};

export const TASK_STATUS_ORDER: TaskStatus[] = [
  "todo",
  "in_progress",
  "paused",
  "done",
  "closed",
];

// Sort weight for the task list "status" column: 待开始 → 进行中 → 已完成 → 已关闭 → 已暂停
export const TASK_STATUS_SORT_ORDER: Record<TaskStatus, number> = {
  todo: 0,
  in_progress: 1,
  done: 2,
  closed: 3,
  paused: 4,
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  p0: "P0 紧急",
  p1: "P1 高",
  p2: "P2 中",
  p3: "P3 低",
};

export const TASK_PRIORITY_ORDER: TaskPriority[] = ["p0", "p1", "p2", "p3"];

// ===== Kanban grouping =====
export type KanbanGroupBy = "status" | "project" | "assignee" | "priority" | "tag";

export const KANBAN_GROUP_BY_LABEL: Record<KanbanGroupBy, string> = {
  status: "状态",
  project: "项目",
  assignee: "负责人",
  priority: "优先级",
  tag: "标签",
};

export const KANBAN_GROUP_BY_ORDER: KanbanGroupBy[] = [
  "status",
  "project",
  "assignee",
  "priority",
  "tag",
];

export const TASK_PRIORITY_COLOR: Record<TaskPriority, string> = {
  p0: "bg-rose-500 text-white",
  p1: "bg-orange-500 text-white",
  p2: "bg-amber-400 text-amber-950",
  p3: "bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
};

// Sort weight for the task list "priority" column: P0 → P1 → P2 → P3
export const TASK_PRIORITY_SORT_ORDER: Record<TaskPriority, number> = {
  p0: 0,
  p1: 1,
  p2: 2,
  p3: 3,
};

// ===== Project constants =====
export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  not_started: "未开始",
  in_progress: "进行中",
  done: "已完成",
  paused: "已暂停",
};

export const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  not_started: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  paused: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "not_started",
  "in_progress",
  "done",
  "paused",
];

export const PROJECT_PRIORITY_LABEL: Record<ProjectPriority, string> = {
  p0: "P0 紧急",
  p1: "P1 高",
  p2: "P2 中",
  p3: "P3 低",
};

export const PROJECT_PRIORITY_COLOR: Record<ProjectPriority, string> = {
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
