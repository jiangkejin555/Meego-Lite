"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { Input } from "@/components/ui/input";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  AlertTriangle,
  Check,
  ChevronDown,
} from "lucide-react";
import {
  TASK_PRIORITY_COLOR,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_COLOR,
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
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
  progress: number;
  latestProgressNote: string | null;
  latestProgressPercent: number | null;
  tags: string[];
  creator: { id: string; name: string; deletedAt?: string | null };
  assignee: { id: string; name: string; deletedAt?: string | null } | null;
  project: { id: string; name: string } | null;
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

async function updateTaskStatus(id: string, status: TaskStatus) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return res.json();
}

async function updateProgress(
  taskId: string,
  userId: string,
  percent: number | null,
  content: string
) {
  const res = await fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, userId, content, percent }),
  });
  if (!res.ok) {
    let message = "Failed to update progress";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }
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

export function TaskList({ tasks, isLoading, users }: { tasks: TaskItem[], isLoading: boolean, users: UserItem[] }) {
  const openTaskForm = useAppStore((s) => s.openTaskForm);
  const setSelectedTaskId = useAppStore((s) => s.setSelectedTaskId);
  const currentUser = useAppStore((s) => s.currentUser);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [pendingProgressId, setPendingProgressId] = useState<string | null>(
    null
  );
  const [progressOpenId, setProgressOpenId] = useState<string | null>(null);
  const [progressNote, setProgressNote] = useState("");

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

  const progressMutation = useMutation({
    mutationFn: ({
      taskId,
      userId,
      percent,
      content,
    }: {
      taskId: string;
      userId: string;
      percent: number | null;
      content: string;
    }) => updateProgress(taskId, userId, percent, content),
    onMutate: ({ taskId }) => setPendingProgressId(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setProgressOpenId(null);
      setProgressNote("");
      toast({ title: "进度已更新" });
    },
    onError: (e: Error) => {
      toast({
        title: "进度更新失败",
        description: e.message,
        variant: "destructive",
      });
    },
    onSettled: () => setPendingProgressId(null),
  });

  const submitProgress = (taskId: string, percent: number) => {
    if (!currentUser) {
      toast({
        title: "无法更新进度",
        description: "请先选择当前用户",
        variant: "destructive",
      });
      return;
    }
    const note = progressNote.trim();
    progressMutation.mutate({
      taskId,
      userId: currentUser.id,
      percent,
      content: note,
    });
  };

  const submitProgressNote = (taskId: string, currentPercent: number) => {
    if (!currentUser) {
      toast({
        title: "无法更新进度",
        description: "请先选择当前用户",
        variant: "destructive",
      });
      return;
    }
    const note = progressNote.trim();
    if (!note) {
      toast({
        title: "无法提交",
        description: "请填写进度说明",
        variant: "destructive",
      });
      return;
    }
    progressMutation.mutate({
      taskId,
      userId: currentUser.id,
      percent: currentPercent,
      content: note,
    });
  };

  const PROGRESS_OPTIONS = [0, 25, 50, 75, 100];

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="table-fixed min-w-[1200px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">任务</TableHead>
                <TableHead className="w-[140px]">项目</TableHead>
                <TableHead className="w-[160px]">标签</TableHead>
                <TableHead className="w-[100px]">状态</TableHead>
                <TableHead className="w-[260px]">进度</TableHead>
                <TableHead className="w-[100px]">优先级</TableHead>
                <TableHead className="w-[120px]">截止时间</TableHead>
                <TableHead className="w-[140px]">责任人</TableHead>
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
                tasks.map((t) => {
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
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Popover
                          open={progressOpenId === t.id}
                          onOpenChange={(open) => {
                            setProgressOpenId(open ? t.id : null);
                            setProgressNote("");
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              disabled={
                                pendingProgressId === t.id &&
                                progressMutation.isPending
                              }
                              className="group flex w-full min-w-0 items-center gap-1.5 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60"
                              title={
                                t.latestProgressNote
                                  ? `${t.latestProgressPercent ?? t.progress}% ${t.latestProgressNote}`
                                  : "点击更新进度"
                              }
                            >
                              <span className="shrink-0 text-xs font-medium tabular-nums">
                                {t.progress}%
                              </span>
                              {t.latestProgressNote ? (
                                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                                  {t.latestProgressNote}
                                </span>
                              ) : (
                                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                                  暂无进度描述
                                </span>
                              )}
                              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            className="w-64 space-y-3"
                          >
                            <div className="text-sm font-medium">更新进度</div>
                            <Input
                              value={
                                progressOpenId === t.id ? progressNote : ""
                              }
                              onChange={(e) =>
                                setProgressNote(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  submitProgressNote(t.id, t.progress);
                                }
                              }}
                              placeholder="进度说明"
                              className="h-8 text-xs"
                            />
                            <div className="grid grid-cols-5 gap-1">
                              {PROGRESS_OPTIONS.map((p) => (
                                <Button
                                  key={p}
                                  type="button"
                                  size="sm"
                                  variant={
                                    p === t.progress ? "secondary" : "outline"
                                  }
                                  disabled={
                                    p === t.progress ||
                                    (pendingProgressId === t.id &&
                                      progressMutation.isPending)
                                  }
                                  className="h-7 px-0 text-xs tabular-nums"
                                  onClick={() => submitProgress(t.id, p)}
                                >
                                  {p === t.progress ? (
                                    <Check className="h-3.5 w-3.5" />
                                  ) : (
                                    p
                                  )}
                                </Button>
                              ))}
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="h-7 w-full text-xs"
                              disabled={
                                !progressNote.trim() ||
                                (pendingProgressId === t.id &&
                                  progressMutation.isPending)
                              }
                              onClick={() => submitProgressNote(t.id, t.progress)}
                            >
                              提交描述（当前进度 {t.progress}%）
                            </Button>
                            <p className="text-[11px] leading-tight text-muted-foreground">
                              选择百分比会同步进度并新增一条描述；「提交描述」会沿用当前进度，仅记录新的描述。
                            </p>
                          </PopoverContent>
                        </Popover>
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
                          <span className="text-xs text-muted-foreground">—</span>
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
