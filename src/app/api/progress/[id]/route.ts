import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import { getSessionUser, unauthorized } from "@/lib/auth";

// PATCH /api/progress/[id]  body: { content }
// 仅记录作者本人可修改
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const { id } = await params;
  const body = await req.json();
  const existing = await db.progressUpdate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "进度记录不存在" }, { status: 404 });
  }
  if (existing.userId !== me.id) {
    return NextResponse.json({ error: "只能修改自己的进度记录" }, { status: 403 });
  }

  if (body.status !== undefined) {
    return NextResponse.json({ error: "不允许修改进度状态" }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "请填写进度描述" }, { status: 400 });
  }

  const updated = await db.progressUpdate.update({
    where: { id },
    data: { content },
    include: { user: true },
  });

  return NextResponse.json({ update: updated });
}

// DELETE /api/progress/[id]
// 仅记录作者本人可删除
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const { id } = await params;
  const existing = await db.progressUpdate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "进度记录不存在" }, { status: 404 });
  }
  if (existing.userId !== me.id) {
    return NextResponse.json({ error: "只能删除自己的进度记录" }, { status: 403 });
  }

  await db.progressUpdate.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
