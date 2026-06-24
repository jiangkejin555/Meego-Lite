import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ProjectPriority, ProjectStatus } from "@/lib/constants";
import { PROJECT_NAME_MAX_LENGTH } from "@/lib/project-utils";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import { getSessionUser, unauthorized } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]
export async function GET(req: NextRequest, ctx: RouteContext) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const { id } = await ctx.params;
  const project = await db.project.findUnique({
    where: { id },
    include: {
      owners: { select: { id: true, name: true, email: true, deletedAt: true } },
      creator: { select: { id: true, name: true, deletedAt: true } },
      _count: { select: { tasks: true } },
    },
  });
  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  const isVisible =
    project.creatorId === me.id ||
    project.owners.some((o) => o.id === me.id);
  if (!isVisible) {
    // Don't leak existence to unauthorized users.
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

// PUT /api/projects/[id]
export async function PUT(req: NextRequest, ctx: RouteContext) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const { id } = await ctx.params;
  const body = await req.json();

  const existing = await db.project.findUnique({
    where: { id },
    include: { owners: { select: { id: true, deletedAt: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  const isVisible =
    existing.creatorId === me.id ||
    existing.owners.some((o) => o.id === me.id);
  if (!isVisible) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  if (existing.creatorId !== me.id) {
    return NextResponse.json(
      { error: "只有项目创建者可以修改项目" },
      { status: 403 }
    );
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
    // The creator must always remain an owner.
    const finalOwnerIds = existing.creatorId
      ? Array.from(new Set([existing.creatorId, ...uniqueOwnerIds]))
      : uniqueOwnerIds;
    data.owners = { set: finalOwnerIds.map((oid) => ({ id: oid })) };
  }

  const project = await db.project.update({
    where: { id },
    data,
    include: {
      owners: { select: { id: true, name: true, email: true, deletedAt: true } },
      creator: { select: { id: true, name: true, deletedAt: true } },
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json({ project });
}

// DELETE /api/projects/[id]
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const { id } = await ctx.params;
  const existing = await db.project.findUnique({
    where: { id },
    select: { id: true, creatorId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  // Only the creator may delete the project.
  if (existing.creatorId !== me.id) {
    return NextResponse.json(
      { error: "只有项目创建者可以删除项目" },
      { status: 403 }
    );
  }

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
