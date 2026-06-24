"use client";

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  AlertTriangle,
  Check,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from "lucide-react";
import {
  TASK_PRIORITY_COLOR,
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_SORT_ORDER,
  TASK_STATUS_COLOR,
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
  TASK_STATUS_SORT_ORDER,
  tagColor,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatUserName, getUserInitials } from "@/lib/users";
import { useToast } from "@/hooks/use-toast";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  latestProgressDescription?: string | null;
  latestProgressNote: string | null;
  tags: string[];
  creator: { id: string; name: string; deletedAt?: string | null };
  assignee: { id: string; name: string; deletedAt?: string | null } | null;
  project: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

async function updateTaskStatus(id: string, status: TaskStatus) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return res.json();
}

function deadlineStatus(
  d: string | null,
  status: TaskStatus
): { label: string; cls: string } | null {
  if (!d) return null;
  const date = new Date(d);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (status === "done" || status === "closed") {
    return {
      label: date.toLocaleDateString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
      }),
      cls: "text-muted-foreground",
    };
  }
  if (diff < 0) {
    return {
      label: `逾期 ${Math.ceil(-diff / dayMs)}d`,
      cls: "text-rose-600 font-medium",
    };
  }
  if (diff < dayMs) {
    return {
      label: `${Math.ceil(diff / (60 * 60 * 1000))}h 内到期`,
      cls: "text-amber-600 font-medium",
    };
  }
  return {
    label: date.toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
    }),
    cls: "text-foreground",
  };
}

type SortKey = "createdAt" | "project" | "status" | "priority" | "deadline" | "assignee";
type SortDir = "asc" | "desc";

// 1 means the value is empty (always sorted last regardless of direction)
function emptyRank(t: TaskItem, key: SortKey): number {
  switch (key) {
    case "project":
      return t.project?.name ? 0 : 1;
    case "deadline":
      return t.deadline ? 0 : 1;
    case "assignee":
      return t.assignee?.name ? 0 : 1;
    default:
      return 0;
  }
}

function compareTasks(a: TaskItem, b: TaskItem, key: SortKey): number {
  switch (key) {
    case "createdAt":
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    case "project":
      return (a.project?.name ?? "").localeCompare(b.project?.name ?? "", "zh-CN");
    case "status":
      return TASK_STATUS_SORT_ORDER[a.status] - TASK_STATUS_SORT_ORDER[b.status];
    case "priority":
      return (
        TASK_PRIORITY_SORT_ORDER[a.priority] -
        TASK_PRIORITY_SORT_ORDER[b.priority]
      );
    case "deadline":
      return new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime();
    case "assignee":
      return (a.assignee?.name ?? "").localeCompare(b.assignee?.name ?? "", "zh-CN");
    default:
      return 0;
  }
}

export function TaskList({
  tasks,
  isLoading,
}: {
  tasks: TaskItem[];
  isLoading: boolean;
}) {
  const openTaskForm = useAppStore((s) => s.openTaskForm);
  const setSelectedTaskId = useAppStore((s) => s.setSelectedTaskId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedTasks = useMemo(() => {
    const factor = sortDir === "asc" ? 1 : -1;
    return [...tasks].sort((a, b) => {
      const ea = emptyRank(a, sortKey);
      const eb = emptyRank(b, sortKey);
      if (ea !== eb) return ea - eb; // empties always last
      return compareTasks(a, b, sortKey) * factor;
    });
  }, [tasks, sortKey, sortDir]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      updateTaskStatus(id, status),
    onMutate: ({ id }) => setPendingStatusId(id),
    onSuccess: (_data, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({
        title: "状态已更新",
        description: `已更新为「${TASK_STATUS_LABEL[status]}」`,
      });
    },
    onError: (e: Error) => {
      toast({
        title: "状态更新失败",
        description: e.message,
        variant: "destructive",
      });
    },
    onSettled: () => setPendingStatusId(null),
  });

  const SortableHead = ({
    sortableKey,
    label,
    className,
  }: {
    sortableKey: SortKey;
    label: string;
    className?: string;
  }) => {
    const active = sortKey === sortableKey;
    const Icon = !active ? ChevronsUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
    return (
      <TableHead className={className}>
        <button
          type="button"
          onClick={() => toggleSort(sortableKey)}
          className={cn(
            "group inline-flex items-center gap-1 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
          title="点击排序"
        >
          {label}
          <Icon
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-opacity",
              active ? "opacity-100" : "opacity-40 group-hover:opacity-70"
            )}
          />
        </button>
      </TableHead>
    );
  };

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="table-fixed min-w-[1200px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">任务</TableHead>
                <SortableHead sortableKey="project" label="项目" className="w-[140px]" />
                <TableHead className="w-[160px]">标签</TableHead>
                <SortableHead sortableKey="status" label="状态" className="w-[100px]" />
                <TableHead className="w-[260px]">进度描述</TableHead>
                <SortableHead sortableKey="priority" label="优先级" className="w-[100px]" />
                <SortableHead sortableKey="deadline" label="截止时间" className="w-[120px]" />
                <SortableHead sortableKey="assignee" label="责任人" className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : tasks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-20"
                  >
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="text-sm text-muted-foreground">暂无任务</div>
                      <Button variant="outline" size="sm" onClick={() => openTaskForm(null)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        新建任务
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedTasks.map((t) => {
                  const dl = deadlineStatus(t.deadline, t.status);
                  return (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setSelectedTaskId(t.id)}
                    >
                      <TableCell className="w-[240px] max-w-[240px]">
                        <div
                          className="font-medium text-sm truncate"
                          title={t.title}
                        >
                          {t.title}
                        </div>
                      </TableCell>
                      <TableCell
                        className="w-[160px] max-w-[160px]"
                        title={t.project?.name ?? ""}
                      >
                        {t.project ? (
                          <span className="block w-full truncate text-xs">
                            {t.project.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {t.tags && t.tags.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {t.tags.slice(0, 2).map((tag) => (
                              <Badge
                                key={tag}
                                className={cn("border-0 font-normal", tagColor(tag))}
                              >
                                {tag}
                              </Badge>
                            ))}
                            {t.tags.length > 2 && (
                              <span className="text-[11px] text-muted-foreground">
                                +{t.tags.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              disabled={
                                pendingStatusId === t.id &&
                                statusMutation.isPending
                              }
                              className="group inline-flex items-center gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60"
                              title="点击修改状态"
                            >
                              <Badge
                                className={cn(
                                  "border-0",
                                  TASK_STATUS_COLOR[t.status]
                                )}
                              >
                                {TASK_STATUS_LABEL[t.status]}
                              </Badge>
                              <ChevronDown className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-36">
                            <DropdownMenuLabel>修改状态</DropdownMenuLabel>
                            {TASK_STATUS_ORDER.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                disabled={s === t.status}
                                onClick={() => {
                                  if (s !== t.status) {
                                    statusMutation.mutate({
                                      id: t.id,
                                      status: s,
                                    });
                                  }
                                }}
                                className="gap-2"
                              >
                                <Badge
                                  className={cn(
                                    "border-0",
                                    TASK_STATUS_COLOR[s]
                                  )}
                                >
                                  {TASK_STATUS_LABEL[s]}
                                </Badge>
                                {s === t.status && (
                                  <Check className="ml-auto h-4 w-4" />
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="w-[260px] max-w-[260px]">
                        <div
                          className="truncate text-xs text-muted-foreground"
                          title={
                            t.latestProgressDescription ??
                            t.latestProgressNote ??
                            "暂无进度描述"
                          }
                        >
                          {t.latestProgressDescription ??
                            t.latestProgressNote ??
                            "暂无进度描述"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "border-0",
                            TASK_PRIORITY_COLOR[t.priority]
                          )}
                        >
                          {TASK_PRIORITY_LABEL[t.priority]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {dl ? (
                          <span className={cn("text-xs", dl.cls)}>
                            {t.status !== "done" &&
                              t.status !== "closed" &&
                              t.deadline &&
                              new Date(t.deadline).getTime() < Date.now() && (
                                <AlertTriangle className="inline h-3 w-3 mr-1" />
                              )}
                            {dl.label}
                          </span>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[11px] font-normal text-muted-foreground bg-slate-50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-700"
                          >
                            长期
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {t.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px]">
                                {getUserInitials(t.assignee)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs">
                              {formatUserName(t.assignee)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            未分配
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        共 {tasks.length} 条结果
      </div>
    </div>
  );
}
