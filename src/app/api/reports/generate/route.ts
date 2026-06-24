import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import { getSessionUser, unauthorized } from "@/lib/auth";
import { type ReportType } from "@/lib/report-aggregate";
import { format } from "date-fns";

// type 仅用于列表/详情的展示分类与筛选，不参与时间范围或业务逻辑。
const REPORT_TYPES = ["daily", "weekly", "monthly", "custom"] as const;

// POST /api/reports/generate  body: { type, startAt, endAt, title? }
// 时间范围由前端按类型与当前时间算好后传入，后端只读区间。
// 异步生成：仅创建一条 status=pending 的占位报告并立即返回，
// 实际 AI 生成由前端随后调用 /api/reports/[id]/run 触发。
export async function POST(req: NextRequest) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const body = await req.json();
  const type = body.type as ReportType;
  if (!REPORT_TYPES.includes(type)) {
    return NextResponse.json({ error: "报告类型不合法" }, { status: 400 });
  }

  if (!body.startAt || !body.endAt) {
    return NextResponse.json({ error: "请提供时间范围" }, { status: 400 });
  }
  const startAt = new Date(body.startAt);
  const endAt = new Date(body.endAt);
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
    return NextResponse.json({ error: "时间范围不合法" }, { status: 400 });
  }

  // 标题：优先使用前端传入的名称，否则按区间生成默认标题
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : `报告 · ${format(startAt, "MM-dd")} ~ ${format(endAt, "MM-dd")}`;

  const report = await db.report.create({
    data: {
      userId: me.id,
      type,
      title,
      content: "",
      startAt,
      endAt,
      status: "pending",
    },
  });

  return NextResponse.json({ report });
}
