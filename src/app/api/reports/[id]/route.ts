import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import { getSessionUser, unauthorized } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/reports/[id]
export async function GET(req: NextRequest, ctx: RouteContext) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const { id } = await ctx.params;
  const report = await db.report.findFirst({
    where: { id, userId: me.id },
  });
  if (!report) {
    return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  }

  return NextResponse.json({ report });
}

// PATCH /api/reports/[id]  body: { title?, content? }
export async function PATCH(req: NextRequest, ctx: RouteContext) {
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

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    }
    data.title = body.title.trim();
  }
  if (body.content !== undefined) {
    if (typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
    }
    data.content = body.content;
  }

  const report = await db.report.update({
    where: { id },
    data,
  });

  return NextResponse.json({ report });
}

// DELETE /api/reports/[id]
export async function DELETE(req: NextRequest, ctx: RouteContext) {
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

  await db.report.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
