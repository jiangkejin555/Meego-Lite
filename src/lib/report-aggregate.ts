import { db } from "@/lib/db";
import { format } from "date-fns";

export type ReportType = "daily" | "weekly" | "monthly" | "custom";

// 聚合后的结构化数据，供 prompt 构建与 meta 统计使用。
export interface AggregatedData {
  // 时间范围内新建的任务
  createdTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: Date;
    project: { id: string; name: string } | null;
  }>;
  // 时间范围内有更新（非新建）的任务
  updatedTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    updatedAt: Date;
    project: { id: string; name: string } | null;
  }>;
  // 时间范围内被标记完成/关闭的任务
  completedTasks: Array<{
    id: string;
    title: string;
    status: string;
    updatedAt: Date;
    project: { id: string; name: string } | null;
  }>;
  // 当前用户在时间范围内提交的进展更新
  progressUpdates: Array<{
    id: string;
    content: string;
    status: string;
    createdAt: Date;
    task: { id: string; title: string } | null;
  }>;
  // 时间范围内创建或更新的项目（我作为负责人）
  projects: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  // 我负责的任务在时间范围内收到的所有评论（含他人评论）
  comments: Array<{
    id: string;
    content: string;
    createdAt: Date;
    task: { id: string; title: string } | null;
    user: { id: string; name: string } | null;
  }>;
  // 各项数量统计
  counts: {
    createdTasks: number;
    updatedTasks: number;
    completedTasks: number;
    progressUpdates: number;
    projects: number;
    comments: number;
  };
}

// 聚合指定用户、指定时间范围内的工作记录。
export async function aggregateReportData(
  userId: string,
  startAt: Date,
  endAt: Date
): Promise<AggregatedData> {
  // 任务口径：只统计负责人为当前用户的任务（assigneeId = userId）。
  // 共享项目中他人负责的任务不纳入个人报告，避免归属混淆。
  const taskScope = { assigneeId: userId };

  const projectSelect = { select: { id: true, name: true } } as const;

  const [createdTasksRaw, updatedTasksRaw, completedTasksRaw, progressRaw, projectsRaw, commentsRaw] =
    await Promise.all([
      // 新建任务
      db.task.findMany({
        where: {
          AND: [taskScope, { createdAt: { gte: startAt, lte: endAt } }],
        },
        include: { project: projectSelect },
        orderBy: { createdAt: "desc" },
      }),
      // 有更新的任务（更新时间在范围内，且非新建）
      db.task.findMany({
        where: {
          AND: [
            taskScope,
            { updatedAt: { gte: startAt, lte: endAt } },
            { updatedAt: { gt: db.task.fields.createdAt } },
          ],
        },
        include: { project: projectSelect },
        orderBy: { updatedAt: "desc" },
      }),
      // 已完成/关闭的任务
      db.task.findMany({
        where: {
          AND: [
            taskScope,
            { status: { in: ["done", "closed"] } },
            { updatedAt: { gte: startAt, lte: endAt } },
          ],
        },
        include: { project: projectSelect },
        orderBy: { updatedAt: "desc" },
      }),
      // 当前用户自己提交的进展更新
      db.progressUpdate.findMany({
        where: {
          userId,
          createdAt: { gte: startAt, lte: endAt },
        },
        include: { task: { select: { id: true, title: true } } },
        orderBy: { createdAt: "desc" },
      }),
      // 我负责的、在范围内创建或更新的项目
      db.project.findMany({
        where: {
          AND: [
            { owners: { some: { id: userId } } },
            {
              OR: [
                { createdAt: { gte: startAt, lte: endAt } },
                { updatedAt: { gte: startAt, lte: endAt } },
              ],
            },
          ],
        },
        orderBy: { updatedAt: "desc" },
      }),
      // 我负责的任务在时间范围内收到的所有评论（含他人评论，按任务聚合）
      db.comment.findMany({
        where: {
          AND: [
            { task: { assigneeId: userId } },
            { createdAt: { gte: startAt, lte: endAt } },
          ],
        },
        include: {
          task: { select: { id: true, title: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const createdTasks = createdTasksRaw.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt,
    project: t.project ? { id: t.project.id, name: t.project.name } : null,
  }));

  const updatedTasks = updatedTasksRaw.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    updatedAt: t.updatedAt,
    project: t.project ? { id: t.project.id, name: t.project.name } : null,
  }));

  const completedTasks = completedTasksRaw.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    updatedAt: t.updatedAt,
    project: t.project ? { id: t.project.id, name: t.project.name } : null,
  }));

  const progressUpdates = progressRaw.map((p) => ({
    id: p.id,
    content: p.content,
    status: (p as { status?: string }).status ?? "unknown",
    createdAt: p.createdAt,
    task: p.task ? { id: p.task.id, title: p.task.title } : null,
  }));

  const projects = projectsRaw.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  const comments = commentsRaw.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt,
    task: c.task ? { id: c.task.id, title: c.task.title } : null,
    user: c.user ? { id: c.user.id, name: c.user.name } : null,
  }));

  return {
    createdTasks,
    updatedTasks,
    completedTasks,
    progressUpdates,
    projects,
    comments,
    counts: {
      createdTasks: createdTasks.length,
      updatedTasks: updatedTasks.length,
      completedTasks: completedTasks.length,
      progressUpdates: progressUpdates.length,
      projects: projects.length,
      comments: comments.length,
    },
  };
}

// 构建调用模型所需的 system / user prompt。
export function buildReportPrompts(
  data: AggregatedData,
  type: ReportType,
  startAt: Date,
  endAt: Date,
  summaryStyle?: string | null
): { system: string; user: string } {
  const systemLines = [
    "你是一名专业的工作助理，负责根据用户提供的工作记录撰写中文工作报告。",
    "",
    "【必须遵守】",
    "1. 输出中文 Markdown。",
    "2. 只基于下方提供的工作记录撰写，不要编造任何数据；能量化的地方使用具体数字（如完成 X 个任务、提交 Y 条过程记录）。",
    "3. 若该时间段内没有工作记录，请如实说明“该时间段内未发现工作记录”，不要杜撰内容。",
    "",
    "【默认结构】",
    "若用户未另行指定组织方式，请使用以下三个二级标题分节：",
    "## 工作进展、## 关键产出、## 下一步计划。",
    "若用户在下方“自定义总结方式”中指定了不同的结构、分组或风格，请优先遵循用户的要求，但仍须满足上述【必须遵守】中的所有条款。",
  ];
  const style = summaryStyle?.trim();
  if (style) {
    systemLines.push("");
    systemLines.push("【自定义总结方式（优先级高于默认结构，但不得违反“必须遵守”）】");
    systemLines.push(style);
  }
  const system = systemLines.join("\n");

  const fmt = (d: Date) => format(d, "yyyy-MM-dd HH:mm");
  const lines: string[] = [];
  lines.push(`报告类型：${type}`);
  lines.push(`时间范围：${fmt(startAt)} ~ ${fmt(endAt)}`);
  lines.push("");
  lines.push(
    `数量统计：新建任务 ${data.counts.createdTasks} 个，更新任务 ${data.counts.updatedTasks} 个，` +
      `完成/关闭任务 ${data.counts.completedTasks} 个，过程记录 ${data.counts.progressUpdates} 条，` +
      `涉及项目 ${data.counts.projects} 个，评论 ${data.counts.comments} 条。`
  );

  lines.push("");
  lines.push("【新建任务】");
  if (data.createdTasks.length === 0) {
    lines.push("（无）");
  } else {
    for (const t of data.createdTasks) {
      lines.push(
        `- ${t.title}（优先级：${t.priority}，状态：${t.status}，项目：${
          t.project?.name ?? "无"
        }，创建于 ${fmt(t.createdAt)}）`
      );
    }
  }

  lines.push("");
  lines.push("【更新任务】");
  if (data.updatedTasks.length === 0) {
    lines.push("（无）");
  } else {
    for (const t of data.updatedTasks) {
      lines.push(
        `- ${t.title}（当前状态：${t.status}，优先级：${t.priority}，项目：${
          t.project?.name ?? "无"
        }，更新于 ${fmt(t.updatedAt)}）`
      );
    }
  }

  lines.push("");
  lines.push("【完成/关闭任务】");
  if (data.completedTasks.length === 0) {
    lines.push("（无）");
  } else {
    for (const t of data.completedTasks) {
      lines.push(
        `- ${t.title}（状态：${t.status}，项目：${
          t.project?.name ?? "无"
        }，完成于 ${fmt(t.updatedAt)}）`
      );
    }
  }

  lines.push("");
  lines.push("【过程记录（我提交的）】");
  if (data.progressUpdates.length === 0) {
    lines.push("（无）");
  } else {
    for (const p of data.progressUpdates) {
      const note = p.content?.trim() ? p.content.trim() : "（无说明）";
      lines.push(
        `- 任务「${p.task?.title ?? "未知任务"}」：状态 ${p.status}，${note}（${fmt(
          p.createdAt
        )}）`
      );
    }
  }

  lines.push("");
  lines.push("【涉及项目】");
  if (data.projects.length === 0) {
    lines.push("（无）");
  } else {
    for (const p of data.projects) {
      lines.push(
        `- ${p.name}（状态：${p.status}，创建于 ${fmt(p.createdAt)}，更新于 ${fmt(
          p.updatedAt
        )}）`
      );
    }
  }

  lines.push("");
  lines.push("【评论（我负责的任务收到的所有评论）】");
  if (data.comments.length === 0) {
    lines.push("（无）");
  } else {
    for (const c of data.comments) {
      lines.push(
        `- 任务「${c.task?.title ?? "未知任务"}」 · ${c.user?.name ?? "匿名"}：${
          c.content
        }（${fmt(c.createdAt)}）`
      );
    }
  }

  const user = lines.join("\n");
  return { system, user };
}
