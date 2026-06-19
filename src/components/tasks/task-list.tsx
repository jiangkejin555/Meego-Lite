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
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Plus,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import {
  TASK_PRIORITY_COLOR,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_COLOR,
  TASK_STATUS_LABEL,
  tagColor,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
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

async function deleteTask(id: string) {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete task");
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "任务已删除" });
      setDeleteId(null);
    },
    onError: (e: Error) => {
      toast({
        title: "删除失败",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">任务</TableHead>
                <TableHead className="w-[180px]">标签</TableHead>
                <TableHead className="w-[90px]">状态</TableHead>
                <TableHead className="w-[80px]">优先级</TableHead>
                <TableHead className="w-[100px]">截止时间</TableHead>
                <TableHead className="w-[120px]">责任人</TableHead>
                <TableHead className="w-[80px]">进度</TableHead>
                <TableHead className="w-[50px]" />
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
                      <TableCell>
                        <div className="font-medium text-sm line-clamp-1">
                          {t.title}
                        </div>
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
                      <TableCell>
                        <Badge
                          className={cn(
                            "border-0",
                            TASK_STATUS_COLOR[t.status]
                          )}
                        >
                          {TASK_STATUS_LABEL[t.status]}
                        </Badge>
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
                                {t.assignee.name
                                  .split(/\s+/)
                                  .map((s) => s[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{t.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            未分配
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs tabular-nums">
                          {t.progress}%
                        </span>
                      </TableCell>
                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>操作</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => setSelectedTaskId(t.id)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openTaskForm(t.id)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-rose-600 focus:text-rose-700"
                              onClick={() => setDeleteId(t.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除该任务？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作不可撤销，任务及其评论、通知记录将被一并删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
