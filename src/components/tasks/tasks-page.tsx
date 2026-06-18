"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RotateCcw, LayoutList, KanbanSquare } from "lucide-react";
import {
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from "@/lib/constants";
import { TaskList } from "./task-list";
import { TaskKanban } from "./task-kanban";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  progress: number;
  tags: string[];
  creator: { id: string; name: string };
  assignee: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
}

async function fetchTasks(filter: Record<string, string>, mine?: string) {
  const params = new URLSearchParams(filter);
  if (mine) params.set("mine", mine);
  const res = await fetch(`/api/tasks?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch tasks");
  const data = await res.json();
  return data.tasks as TaskItem[];
}

async function fetchUsers() {
  const res = await fetch("/api/users");
  if (!res.ok) return [];
  const data = await res.json();
  return data.users as UserItem[];
}

export function TasksPage({ mine = false }: { mine?: boolean }) {
  const filter = useAppStore((s) => s.filter);
  const setFilter = useAppStore((s) => s.setFilter);
  const resetFilter = useAppStore((s) => s.resetFilter);
  const currentUser = useAppStore((s) => s.currentUser);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

  const filterParams = useMemo(
    () => ({
      search: filter.search,
      type: filter.type,
      status: filter.status,
      priority: filter.priority,
      assigneeId: filter.assigneeId,
      creatorId: filter.creatorId,
    }),
    [filter]
  );

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", filterParams, mine, currentUser?.id],
    queryFn: () => fetchTasks(filterParams, mine ? currentUser?.id : undefined),
    refetchInterval: 30_000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  return (
    <div className="space-y-4">
      {/* Filter Bar and View Switcher */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-2">
        {/* Left side: Search & Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-[320px]">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索标题或描述..."
              value={filter.search}
              onChange={(e) => setFilter({ search: e.target.value })}
              className="pl-8 bg-card shadow-sm"
            />
          </div>
          
          <Select
            value={filter.type}
            onValueChange={(v) => setFilter({ type: v as TaskType | "all" })}
          >
            <SelectTrigger className="h-9 w-auto min-w-[110px] bg-card shadow-sm border-dashed">
              <div className="flex items-center text-xs">
                <span className="text-muted-foreground mr-1.5">类型:</span>
                <SelectValue placeholder="全部" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="requirement">需求</SelectItem>
              <SelectItem value="task">任务</SelectItem>
              <SelectItem value="bug">缺陷</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filter.status}
            onValueChange={(v) => setFilter({ status: v as TaskStatus | "all" })}
          >
            <SelectTrigger className="h-9 w-auto min-w-[110px] bg-card shadow-sm border-dashed">
              <div className="flex items-center text-xs">
                <span className="text-muted-foreground mr-1.5">状态:</span>
                <SelectValue placeholder="全部" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="todo">待开始</SelectItem>
              <SelectItem value="in_progress">进行中</SelectItem>
              <SelectItem value="testing">测试中</SelectItem>
              <SelectItem value="done">已完成</SelectItem>
              <SelectItem value="closed">已关闭</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filter.priority}
            onValueChange={(v) => setFilter({ priority: v as TaskPriority | "all" })}
          >
            <SelectTrigger className="h-9 w-auto min-w-[110px] bg-card shadow-sm border-dashed">
              <div className="flex items-center text-xs">
                <span className="text-muted-foreground mr-1.5">优先级:</span>
                <SelectValue placeholder="全部" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="p0">P0 紧急</SelectItem>
              <SelectItem value="p1">P1 高</SelectItem>
              <SelectItem value="p2">P2 中</SelectItem>
              <SelectItem value="p3">P3 低</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filter.assigneeId}
            onValueChange={(v) => setFilter({ assigneeId: v })}
          >
            <SelectTrigger className="h-9 w-auto min-w-[120px] bg-card shadow-sm border-dashed">
              <div className="flex items-center text-xs">
                <span className="text-muted-foreground mr-1.5">责任人:</span>
                <SelectValue placeholder="全部" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filter.search ||
            filter.type !== "all" ||
            filter.status !== "all" ||
            filter.priority !== "all" ||
            filter.assigneeId !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resetFilter()}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              重置
            </Button>
          )}
        </div>

        {/* Right side: View Switcher */}
        <div className="flex items-center rounded-md border p-1 bg-muted/50 shrink-0">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-3 text-xs shadow-none"
            onClick={() => setViewMode("list")}
          >
            <LayoutList className="h-3.5 w-3.5 mr-1.5" />
            列表
          </Button>
          <Button
            variant={viewMode === "kanban" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-3 text-xs shadow-none"
            onClick={() => setViewMode("kanban")}
          >
            <KanbanSquare className="h-3.5 w-3.5 mr-1.5" />
            看板
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === "list" ? (
        <TaskList tasks={tasks} isLoading={isLoading} users={users} />
      ) : (
        <TaskKanban tasks={tasks} isLoading={isLoading} />
      )}
    </div>
  );
}
