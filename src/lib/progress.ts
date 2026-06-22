import { db } from "@/lib/db";

export function normalizePercent(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
}

// Recompute Task.progress from the most recent progress update that has a percent.
export async function syncTaskProgress(taskId: string) {
  const latest = await db.progressUpdate.findFirst({
    where: { taskId, percent: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  await db.task.update({
    where: { id: taskId },
    data: { progress: latest?.percent ?? 0 },
  });
}
