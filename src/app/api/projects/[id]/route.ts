import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ProjectPriority, ProjectStatus } from "@/lib/constants";
import { PROJECT_NAME_MAX_LENGTH } from "@/lib/project-utils";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const project = await db.project.findUnique({
    where: { id },
    include: {
      owners: { select: { id: true, name: true, email: true, deletedAt: true } },
      _count: { select: { tasks: true } },
    },
  });
  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }
  return NextResponse.json({ project });
}

// PUT /api/projects/[id]
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const body = await req.json();

  const existing = await db.project.findUnique({
    where: { id },
    include: { owners: { select: { id: true, deletedAt: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "项目名称不能为空" }, { status: 400 });
    }
    if (name.length > PROJECT_NAME_MAX_LENGTH) {
      return NextResponse.json(
        { error: `项目名称最多${PROJECT_NAME_MAX_LENGTH}个字符` },
        { status: 400 }
      );
    }
    data.name = name;
  }
  if (body.description !== undefined)
    data.description = body.description?.trim() || null;
  if (body.status !== undefined) data.status = body.status as ProjectStatus;
  if (body.priority !== undefined)
    data.priority = body.priority as ProjectPriority;
  if (body.ownerIds !== undefined) {
    const ownerIds: string[] = Array.isArray(body.ownerIds)
      ? body.ownerIds.filter(
          (oid: unknown): oid is string => typeof oid === "string"
        )
      : [];
    const uniqueOwnerIds = Array.from(new Set(ownerIds));
    const existingDeletedOwnerIds = new Set(
      existing.owners
        .filter((owner) => owner.deletedAt)
        .map((owner) => owner.id)
    );
    const newlySelectedOwnerIds = uniqueOwnerIds.filter(
      (ownerId) => !existingDeletedOwnerIds.has(ownerId)
    );
    if (newlySelectedOwnerIds.length > 0) {
      const activeOwnerCount = await db.user.count({
        where: { id: { in: newlySelectedOwnerIds }, deletedAt: null },
      });
      if (activeOwnerCount !== newlySelectedOwnerIds.length) {
        return NextResponse.json(
          { error: "项目负责人包含不存在或已删除的成员" },
          { status: 400 }
        );
      }
    }
    data.owners = { set: uniqueOwnerIds.map((oid) => ({ id: oid })) };
  }

  const project = await db.project.update({
    where: { id },
    data,
    include: {
      owners: { select: { id: true, name: true, email: true, deletedAt: true } },
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json({ project });
}

// DELETE /api/projects/[id]
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  try {
    // Detach tasks from this project before deleting
    await db.task.updateMany({
      where: { projectId: id },
      data: { projectId: null },
    });
    await db.project.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }
}
