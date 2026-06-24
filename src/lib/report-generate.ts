import { db } from "@/lib/db";
import {
  aggregateReportData,
  buildReportPrompts,
  type AggregatedData,
  type ReportType,
} from "@/lib/report-aggregate";
import { generateReportMarkdown } from "@/lib/openai";
import { format } from "date-fns";

// 临时 mock：在未配置真实 OpenAI 凭证时预览前端效果。
// 通过环境变量 REPORTS_MOCK=1 开启；关闭后走真实 AI 调用。
export function buildMockReport(
  data: AggregatedData,
  startAt: Date,
  endAt: Date
): string {
  const range = `${format(startAt, "yyyy-MM-dd HH:mm")} ~ ${format(endAt, "yyyy-MM-dd HH:mm")}`;
  const c = data.counts;

  const doneItems =
    data.completedTasks.length > 0
      ? data.completedTasks
          .slice(0, 5)
          .map((t) => `- ✅ **${t.title}**（项目：${t.project?.name ?? "无"}）`)
          .join("\n")
      : "- ✅ 完成「报告生成」功能联调\n- ✅ 优化「生成报告」弹窗交互";

  const progressItems =
    data.progressUpdates.length > 0
      ? data.progressUpdates
          .slice(0, 5)
          .map(
            (p) =>
              `- 任务「${p.task?.title ?? "未知任务"}」：状态 ${
                p.status
              }，${p.content?.trim() ? p.content.trim() : "持续推进中"}`
          )
          .join("\n")
      : "- 任务「接入 AI 报告」：状态 in_progress，已完成报告数据聚合与提示词拼装，正在联调生成链路\n- 任务「前端样式打磨」：状态 in_progress，已完成弹窗与结果区样式调整，正在收敛交互细节";

  return [
    "# 工作报告",
    "",
    `> 统计区间：${range}`,
    "",
    "## 工作进展",
    "",
    `本区间共新建任务 **${c.createdTasks}** 个，更新任务 **${c.updatedTasks}** 个，完成/关闭任务 **${c.completedTasks}** 个，提交进展 **${c.progressUpdates}** 条，涉及 **${c.projects}** 个项目。`,
    "",
    progressItems,
    "",
    "## 关键产出",
    "",
    doneItems,
    "",
    "### 数据概览",
    "",
    "| 指标 | 数量 |",
    "| --- | --- |",
    `| 新建任务 | ${c.createdTasks} |`,
    `| 更新任务 | ${c.updatedTasks} |`,
    `| 完成/关闭任务 | ${c.completedTasks} |`,
    `| 进展更新 | ${c.progressUpdates} |`,
    `| 涉及项目 | ${c.projects} |`,
    "",
    "## 下一步计划",
    "",
    "1. 跟进未完成任务，推动关键节点交付",
    "2. 补充任务进展记录，保持信息同步",
    "3. 复盘本阶段产出，规划下一阶段重点",
    "",
    "---",
    "",
    "_本报告为 Mock 数据，仅用于前端效果预览。_",
  ].join("\n");
}

// 执行一份 pending 报告的实际生成：聚合数据 → 调用 AI（或 mock）→ 回填内容/状态。
// 成功时写入 content/meta 并置 status=done；失败时置 status=failed 并记录 error。
export async function runReportGeneration(report: {
  id: string;
  userId: string;
  type: string;
  startAt: Date;
  endAt: Date;
}) {
  const type = report.type as ReportType;
  const mockMode = process.env.REPORTS_MOCK === "1";

  try {
    const data = await aggregateReportData(
      report.userId,
      report.startAt,
      report.endAt
    );

    let content: string;
    if (mockMode) {
      content = buildMockReport(data, report.startAt, report.endAt);
    } else {
      const user = await db.user.findUnique({
        where: { id: report.userId },
        select: {
          openaiApiKey: true,
          openaiBaseUrl: true,
          openaiModel: true,
          reportSummaryStyle: true,
        },
      });
      if (!user?.openaiApiKey?.trim()) {
        throw new Error("尚未在「报告设置」中配置 AI API Key");
      }
      const { system, user: userPrompt } = buildReportPrompts(
        data,
        type,
        report.startAt,
        report.endAt,
        user.reportSummaryStyle
      );
      content = await generateReportMarkdown(
        {
          apiKey: user.openaiApiKey,
          baseURL: user.openaiBaseUrl,
          model: user.openaiModel,
        },
        system,
        userPrompt
      );
    }

    await db.report.update({
      where: { id: report.id },
      data: {
        content,
        meta: JSON.stringify(data.counts),
        status: "done",
        error: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.report.update({
      where: { id: report.id },
      data: { status: "failed", error: message },
    });
  }
}
