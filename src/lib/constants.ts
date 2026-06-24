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

// ===== Report summary presets =====
// 自定义总结方式的快捷模板：用户可一键填入输入框，也可在此基础上自行修改。
// 报告的数据来源与基本约束由系统提示词统一控制，这里只描述组织方式 / 风格偏好。
export interface ReportSummaryPreset {
  label: string;
  value: string;
}

export const REPORT_SUMMARY_PRESETS: ReportSummaryPreset[] = [
  {
    label: "按项目分组",
    value:
      "按项目对内容进行分组：每个涉及的项目作为一个二级标题（## 项目名），其下分三块——本阶段进展（用要点列出该项目下完成/更新的任务，以及关键状态变化和过程记录）、关键产出（该项目最重要的 1-3 项成果）、下一步（明确的待办）。没有归属项目的任务统一归入「## 其他」。各项目按其下任务的最高优先级排序（含 P0 的项目排在前）。每条要点尽量带上具体数字、当前状态或关键推进说明。",
  },
  {
    label: "管理者汇报",
    value:
      "面向上级管理者，结论先行、语气正式简洁，全文控制在 300 字以内。开头用「## 一句话总结」给出 2-3 句整体进展概述（含关键量化数据，如完成 X 个任务、推进 Y 个项目）；随后「## 关键成果」列 3-5 条最重要的产出，每条一行、突出业务价值而非操作细节；最后「## 下一步重点」列 2-3 条核心计划。忽略琐碎事项，只保留对结果有影响的内容。",
  },
  {
    label: "优先级与风险",
    value:
      "以优先级和风险为主线组织内容。先输出「## 高优先级进展」，列出所有 P0/P1 相关任务的当前状态、最新过程记录和已产生的结果；再输出「## ⚠️ 风险与阻塞」，列出长时间未更新、推进受阻或仍处于待开始/暂停状态的关键任务，并简要说明可能影响；然后「## 其他进展」用要点简要带过 P2/P3 任务；最后「## 下一步计划」聚焦如何推进高优先级与化解风险。若无风险项，请在风险小节注明「本阶段无明显风险」。",
  },
  {
    label: "数据看板",
    value:
      "以表格为主呈现。先用一段话概述数量统计（新建/更新/完成任务数、过程记录条数、涉及项目数）。「## 任务明细」用 Markdown 表格，列为：任务 | 项目 | 状态 | 优先级 | 过程说明；优先收录有过程记录或已完成的任务。「## 项目概览」用表格列出涉及项目及其状态。最后「## 下一步」用不超过 5 条的要点列出计划。表格中无数据的单元格填「-」。",
  },
  {
    label: "复盘反思",
    value:
      "在「进展 / 关键产出 / 计划」基础结构之上，额外增加「## 复盘与思考」小节，包含三部分：做得好的地方（结合已完成任务与推进清晰的过程记录）、待改进的地方（结合停滞、延期或反复变更的任务）、下阶段调整建议。复盘要基于实际任务数据给出具体例子，避免空泛套话；计划部分需呼应复盘中提出的改进点。",
  },
  {
    label: "极简日清单",
    value:
      "只输出两个小节，不使用表格、不写客套话。「## 今天完成」：按实际推进程度列出今天推进过的任务，每条一行，格式为「任务名 — 状态 + 过程说明（项目名）」。「## 明天计划」：列出 3-5 条明确、可执行的待办，优先安排未完成的高优先级任务。全文控制在 200 字以内。",
  },
  {
    label: "叙事周报",
    value:
      "用连贯的叙事段落而非纯要点来撰写，语气自然专业。「## 本周概览」用 2-4 句话讲清这周的主线和整体节奏（含关键数字）。「## 重点推进」分 2-3 个主题段落，每段围绕一个项目或一类工作展开，串联相关任务的进展与产出。「## 下周计划」回到要点形式，列出明确的优先事项。避免逐条罗列所有任务，要有取舍和归纳。",
  },
];

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
