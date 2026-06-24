import { useQuery } from "@tanstack/react-query";
import type { ProjectPriority, ProjectStatus } from "@/lib/constants";

export interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  owners: { id: string; name: string; email: string; deletedAt?: string | null }[];
  creatorId: string | null;
  creator: { id: string; name: string; deletedAt?: string | null } | null;
  _count: { tasks: number };
  createdAt: string;
  updatedAt: string;
}

export async function fetchProjects(): Promise<ProjectItem[]> {
  const res = await fetch("/api/projects");
  if (!res.ok) return [];
  const data = await res.json();
  return data.projects as ProjectItem[];
}

export async function createProject(payload: Record<string, unknown>) {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "创建失败");
  }
  return res.json();
}

export async function updateProject(
  id: string,
  payload: Record<string, unknown>
) {
  const res = await fetch(`/api/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "更新失败");
  }
  return res.json();
}

export async function deleteProject(id: string) {
  const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "删除失败");
  }
  return res.json();
}

export function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: fetchProjects });
}
