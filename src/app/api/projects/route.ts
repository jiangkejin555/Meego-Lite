import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ProjectPriority, ProjectStatus } from "@/lib/constants";
import { PROJECT_NAME_MAX_LENGTH } from "@/lib/project-utils";

// GET /api/projects — list with optional filters
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const status = url.searchParams.get("status") || undefined;
  const search = url.searchParams.get("search") || undefined;

  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const projects = await db.project.findMany({
    where,
    include: {
      owners: { select: { id: true, name: true, email: true, deletedAt: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ projects });
}

// POST /api/projects — create a new project
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "项目名称不能为空" }, { status: 400 });
  }
  const name = body.name.trim();
  if (name.length > PROJECT_NAME_MAX_LENGTH) {
    return NextResponse.json(
      { error: `项目名称最多${PROJECT_NAME_MAX_LENGTH}个字符` },
      { status: 400 }
    );
  }

  const ownerIds: string[] = Array.isArray(body.ownerIds)
    ? body.ownerIds.filter((id: unknown): id is string => typeof id === "string")
    : [];
  if (ownerIds.length > 0) {
    const activeOwnerCount = await db.user.count({
      where: { id: { in: ownerIds }, deletedAt: null },
    });
    if (activeOwnerCount !== new Set(ownerIds).size) {
      return NextResponse.json(
        { error: "项目负责人包含不存在或已删除的成员" },
        { status: 400 }
      );
    }
  }

  const project = await db.project.create({
    data: {
      name,
      description: body.description?.trim() || null,
      status: (body.status as ProjectStatus) || "not_started",
      priority: (body.priority as ProjectPriority) || "p2",
      owners: ownerIds.length
        ? { connect: ownerIds.map((id) => ({ id })) }
        : undefined,
    },
    include: {
      owners: { select: { id: true, name: true, email: true, deletedAt: true } },
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json({ project });
}
