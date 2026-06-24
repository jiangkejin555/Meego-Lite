import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import { getSessionUser, unauthorized } from "@/lib/auth";
import { runReportGeneration } from "@/lib/report-generate";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/reports/[id]/run
// 实际执行一份 pending 报告的生成（聚合 + AI/mock），完成或失败均更新状态。
// 前端在创建占位报告后调用，无需等待响应即可轮询列表。
export async function POST(req: NextRequest, ctx: RouteContext) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const { id } = await ctx.params;
  const existing = await db.report.findFirst({
    where: { id, userId: me.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  }

  // 仅对 pending 报告执行，避免重复生成已完成/失败的报告
  if (existing.status !== "pending") {
    return NextResponse.json({ report: existing });
  }

  await runReportGeneration({
    id: existing.id,
    userId: existing.userId,
    type: existing.type,
    startAt: existing.startAt,
    endAt: existing.endAt,
  });

  const report = await db.report.findUnique({ where: { id } });
  return NextResponse.json({ report });
}
