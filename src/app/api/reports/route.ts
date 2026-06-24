import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import { getSessionUser, unauthorized } from "@/lib/auth";

const REPORT_TYPES = ["daily", "weekly", "monthly", "custom"] as const;
type ReportType = (typeof REPORT_TYPES)[number];

// GET /api/reports — 列出当前用户的报告，支持按内容模糊查询、类型、创建时间筛选
export async function GET(req: NextRequest) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const url = req.nextUrl;
  const search = url.searchParams.get("search")?.trim() || undefined;
  const typeParam = url.searchParams.get("type") || undefined;
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;

  const and: Record<string, unknown>[] = [{ userId: me.id }];

  if (typeParam && REPORT_TYPES.includes(typeParam as ReportType)) {
    and.push({ type: typeParam });
  }

  if (search) {
    and.push({
      OR: [{ title: { contains: search } }, { content: { contains: search } }],
    });
  }

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (from) {
    const d = new Date(from);
    if (!isNaN(d.getTime())) createdAt.gte = d;
  }
  if (to) {
    const d = new Date(to);
    if (!isNaN(d.getTime())) createdAt.lte = d;
  }
  if (createdAt.gte || createdAt.lte) {
    and.push({ createdAt });
  }

  const reports = await db.report.findMany({
    where: { AND: and },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reports });
}

// POST /api/reports — 手动创建一份报告
export async function POST(req: NextRequest) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const body = await req.json();

  if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  }
  if (!body.content || typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
  }
  if (!REPORT_TYPES.includes(body.type)) {
    return NextResponse.json({ error: "报告类型不合法" }, { status: 400 });
  }

  const type = body.type as ReportType;
  const startAt = body.startAt ? new Date(body.startAt) : new Date();
  const endAt = body.endAt ? new Date(body.endAt) : new Date();

  let meta: string | null = null;
  if (body.meta !== undefined && body.meta !== null) {
    meta = typeof body.meta === "string" ? body.meta : JSON.stringify(body.meta);
  }

  const report = await db.report.create({
    data: {
      userId: me.id,
      type,
      title: body.title.trim(),
      content: body.content,
      startAt,
      endAt,
      meta,
    },
  });

  return NextResponse.json({ report });
}
