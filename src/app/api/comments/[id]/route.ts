import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import { getSessionUser, unauthorized } from "@/lib/auth";

// PATCH /api/comments/[id]  body: { content }
// 仅评论作者本人可修改
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }
  const existing = await db.comment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "评论不存在" }, { status: 404 });
  }
  if (existing.userId !== me.id) {
    return NextResponse.json({ error: "只能修改自己的评论" }, { status: 403 });
  }
  const updated = await db.comment.update({
    where: { id },
    data: { content },
    include: { user: true },
  });
  return NextResponse.json({ comment: updated });
}

// DELETE /api/comments/[id]
// 仅评论作者本人可删除
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const { id } = await params;
  const existing = await db.comment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "评论不存在" }, { status: 404 });
  }
  if (existing.userId !== me.id) {
    return NextResponse.json({ error: "只能删除自己的评论" }, { status: 403 });
  }
  await db.comment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
