import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ProjectPriority, ProjectStatus } from "@/lib/constants";
import { PROJECT_NAME_MAX_LENGTH } from "@/lib/project-utils";
import { ensureDatabaseSchema } from "@/lib/db-migrations";
import { getSessionUser, unauthorized } from "@/lib/auth";

// GET /api/projects — list with optional filters
export async function GET(req: NextRequest) {
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

  const url = req.nextUrl;
  const status = url.searchParams.get("status") || undefined;
  const search = url.searchParams.get("search") || undefined;

  // Visibility: only projects created by me or where I'm an owner.
  const visibility = {
    OR: [{ creatorId: me.id }, { owners: { some: { id: me.id } } }],
  };

  // Combine visibility with the other filters via AND so that the search OR
  // can never override the visibility OR.
  const andConditions: Record<string, unknown>[] = [visibility];
  if (status && status !== "all") andConditions.push({ status });
  if (search) {
    andConditions.push({
      OR: [
        { name: { contains: search } },
        { description: { contains: search } },
      ],
    });
  }

  const projects = await db.project.findMany({
    where: { AND: andConditions },
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
  await ensureDatabaseSchema();

  const me = await getSessionUser(req);
  if (!me) return unauthorized();

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

  // The creator is always an owner; merge & de-duplicate.
  const allOwnerIds = Array.from(new Set([me.id, ...ownerIds]));

  const project = await db.project.create({
    data: {
      name,
      description: body.description?.trim() || null,
      status: (body.status as ProjectStatus) || "not_started",
      priority: (body.priority as ProjectPriority) || "p2",
      creatorId: me.id,
      owners: { connect: allOwnerIds.map((id) => ({ id })) },
    },
    include: {
      owners: { select: { id: true, name: true, email: true, deletedAt: true } },
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json({ project });
}
