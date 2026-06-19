import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseStringArray } from "@/lib/constants";

// GET /api/tags — distinct, non-empty, sorted tag list across all tasks
export async function GET() {
  const tasks = await db.task.findMany({ select: { tags: true } });

  const set = new Set<string>();
  for (const t of tasks) {
    for (const tag of parseStringArray(t.tags)) {
      const v = tag.trim();
      if (v) set.add(v);
    }
  }

  const tags = Array.from(set).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  return NextResponse.json({ tags });
}
