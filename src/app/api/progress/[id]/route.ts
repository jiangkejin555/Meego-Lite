import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import { normalizePercent, syncTaskProgress } from "@/lib/progress";

// PATCH /api/progress/[id]  body: { userId, content?, percent? }
// 仅记录作者本人可修改
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDatabaseSchema();

  const { id } = await params;
  const body = await req.json();
  if (!body.userId) {
    return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  }
  const existing = await db.progressUpdate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "进度记录不存在" }, { status: 404 });
  }
  if (existing.userId !== body.userId) {
    return NextResponse.json({ error: "只能修改自己的进度记录" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (body.content !== undefined) {
    data.content = String(body.content).trim();
  }
  let percentChanged = false;
  if (body.percent !== undefined) {
    data.percent = normalizePercent(body.percent);
    percentChanged = true;
  }

  // After applying changes, ensure at least content or percent remains.
  const finalContent =
    data.content !== undefined ? (data.content as string) : existing.content;
  const finalPercent =
    data.percent !== undefined ? (data.percent as number | null) : existing.percent;
  if (!finalContent && finalPercent === null) {
    return NextResponse.json(
      { error: "进度说明与百分比不能同时为空" },
      { status: 400 }
    );
  }

  const updated = await db.progressUpdate.update({
    where: { id },
    data,
    include: { user: true },
  });

  if (percentChanged) {
    await syncTaskProgress(existing.taskId);
  }

  return NextResponse.json({ update: updated });
}

// DELETE /api/progress/[id]?userId=...
// 仅记录作者本人可删除
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDatabaseSchema();

  const { id } = await params;
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  }
  const existing = await db.progressUpdate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "进度记录不存在" }, { status: 404 });
  }
  if (existing.userId !== userId) {
    return NextResponse.json({ error: "只能删除自己的进度记录" }, { status: 403 });
  }

  await db.progressUpdate.delete({ where: { id } });

  if (existing.percent !== null) {
    await syncTaskProgress(existing.taskId);
  }

  return NextResponse.json({ ok: true });
}
