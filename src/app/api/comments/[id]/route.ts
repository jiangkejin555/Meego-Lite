import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH /api/comments/[id]  body: { userId, content }
// 仅评论作者本人可修改
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  if (!body.userId || !body.content?.trim()) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }
  const existing = await db.comment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "评论不存在" }, { status: 404 });
  }
  if (existing.userId !== body.userId) {
    return NextResponse.json({ error: "只能修改自己的评论" }, { status: 403 });
  }
  const updated = await db.comment.update({
    where: { id },
    data: { content: String(body.content).trim() },
    include: { user: true },
  });
  return NextResponse.json({ comment: updated });
}

// DELETE /api/comments/[id]?userId=...
// 仅评论作者本人可删除
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  }
  const existing = await db.comment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "评论不存在" }, { status: 404 });
  }
  if (existing.userId !== userId) {
    return NextResponse.json({ error: "只能删除自己的评论" }, { status: 403 });
  }
  await db.comment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
