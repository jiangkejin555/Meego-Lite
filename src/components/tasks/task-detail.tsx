"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tag,
  Pencil,
  MessageSquare,
  Bell,
  Send,
  LogOut,
  Trash2,
  Check,
  X,
} from "lucide-react";
import {
  TASK_PRIORITY_COLOR,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_COLOR,
  TASK_STATUS_LABEL,
  tagColor,
  NOTIFICATION_CHANNEL_LABEL,
  NOTIFICATION_STATUS_LABEL,
  NOTIFICATION_TYPE_LABEL,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatUserName, getUserInitials } from "@/lib/users";
import { useToast } from "@/hooks/use-toast";

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  progress: number;
  tags: string[];
  estimatedHours: number | null;
  actualHours: number | null;
  creator: { id: string; name: string; email: string; deletedAt?: string | null };
  assignee: { id: string; name: string; email: string; deletedAt?: string | null } | null;
  project: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    user: { id: string; name: string; deletedAt?: string | null };
  }>;
  notifications: Array<{
    id: string;
    type: string;
    channel: string;
    title: string;
    content: string;
    status: string;
    error: string | null;
    sentAt: string | null;
    createdAt: string;
  }>;
}

async function fetchTask(id: string) {
  const res = await fetch(`/api/tasks/${id}`);
  if (!res.ok) throw new Error("Failed to fetch task");
  const data = await res.json();
  return data.task as TaskDetail;
}

async function addComment(taskId: string, userId: string, content: string) {
  const res = await fetch("/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, userId, content }),
  });
  if (!res.ok) throw new Error("Failed to add comment");
  return res.json();
}

async function updateComment(id: string, userId: string, content: string) {
  const res = await fetch(`/api/comments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, content }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "修改失败");
  }
  return res.json();
}

async function deleteComment(id: string, userId: string) {
  const res = await fetch(`/api/comments/${id}?userId=${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "删除失败");
  }
  return res.json();
}

export function TaskDetailDrawer() {
  const taskId = useAppStore((s) => s.selectedTaskId);
  const setSelectedTaskId = useAppStore((s) => s.setSelectedTaskId);
  const openTaskForm = useAppStore((s) => s.openTaskForm);
  const currentUser = useAppStore((s) => s.currentUser);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const { data: task } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => fetchTask(taskId!),
    enabled: !!taskId,
    refetchInterval: 30_000,
  });

  const commentMutation = useMutation({
    mutationFn: ({
      taskId,
      userId,
      content,
    }: {
      taskId: string;
      userId: string;
      content: string;
    }) => addComment(taskId, userId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({
        queryKey: ["notifications", currentUser?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["unread", currentUser?.id] });
      setComment("");
      toast({ title: "评论已发布" });
    },
    onError: (e: Error) => {
      toast({
        title: "评论失败",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ id, userId, content }: { id: string; userId: string; content: string }) =>
      updateComment(id, userId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      setEditingId(null);
      setEditingContent("");
      toast({ title: "评论已更新" });
    },
    onError: (e: Error) => {
      toast({ title: "修改失败", description: e.message, variant: "destructive" });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      deleteComment(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      toast({ title: "评论已删除" });
    },
    onError: (e: Error) => {
      toast({ title: "删除失败", description: e.message, variant: "destructive" });
    },
  });

  if (!task) return null;

  const open = !!taskId;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && setSelectedTaskId(null)}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col gap-0">
        {/* Top Action Bar */}
        <div className="flex items-center justify-end px-6 pt-5 pb-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedTaskId(null);
                openTaskForm(task.id);
              }}
              className="h-8 shadow-none"
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              编辑
            </Button>
            <SheetClose asChild>
              <Button size="sm" variant="outline" className="h-8 shadow-none">
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                退出
              </Button>
            </SheetClose>
          </div>
        </div>

        <div className="px-6 sm:px-8 pb-8 space-y-8">
          {/* Header / Title */}
          <SheetHeader className="p-0">
            <SheetTitle className="text-xl sm:text-2xl font-semibold leading-tight text-left">
              {task.title}
            </SheetTitle>
          </SheetHeader>

          {/* Meta Information (Row Layout) */}
          <div className="space-y-4">
            <MetaRow label="状态">
              <Badge className={cn("border-0 shadow-none font-medium", TASK_STATUS_COLOR[task.status])}>
                {TASK_STATUS_LABEL[task.status]}
              </Badge>
            </MetaRow>
            
            <MetaRow label="优先级">
              <Badge className={cn("border-0 shadow-none font-medium", TASK_PRIORITY_COLOR[task.priority])}>
                {TASK_PRIORITY_LABEL[task.priority]}
              </Badge>
            </MetaRow>

            <MetaRow label="负责人">
              {task.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px]">
                      {getUserInitials(task.assignee)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">
                    {formatUserName(task.assignee)}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground">未分配</span>
              )}
            </MetaRow>

            <MetaRow label="创建人">
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px]">
                    {getUserInitials(task.creator)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-foreground">
                  {formatUserName(task.creator)}
                </span>
              </div>
            </MetaRow>

            <MetaRow label="所属项目">
              {task.project ? (
                <span className="text-foreground">{task.project.name}</span>
              ) : (
                <span className="text-muted-foreground">暂不关联</span>
              )}
            </MetaRow>

            <MetaRow label="截止时间">
              {task.deadline ? (
                <span
                  className={cn(
                    "text-foreground",
                    new Date(task.deadline).getTime() < Date.now() &&
                      task.status !== "done" &&
                      task.status !== "closed" &&
                      "text-rose-600 font-medium"
                  )}
                >
                  {new Date(task.deadline).toLocaleString("zh-CN")}
                </span>
              ) : (
                <span className="text-muted-foreground">未设置</span>
              )}
            </MetaRow>

            <MetaRow label="创建时间">
              <span className="text-foreground">{new Date(task.createdAt).toLocaleString("zh-CN")}</span>
            </MetaRow>

            <MetaRow label="预估工时">
              <span className="text-foreground">
                {task.estimatedHours != null ? `${task.estimatedHours} h` : "未填写"}
              </span>
            </MetaRow>

            <MetaRow label="实际工时">
              <span className="text-foreground">
                {task.actualHours != null ? `${task.actualHours} h` : "未填写"}
              </span>
            </MetaRow>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">完成进度</span>
              <span className="tabular-nums font-medium">{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-2" />
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Tag className="h-4 w-4" />
                标签
              </div>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag) => (
                  <Badge key={tag} className={cn("border-0 shadow-none font-normal", tagColor(tag))}>
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator className="bg-border/50" />

          {/* Description */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">任务描述</div>
            <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
              {task.description || (
                <span className="text-muted-foreground italic">无描述</span>
              )}
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Comments */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              评论 ({task.comments.length})
            </div>
            <div className="space-y-4">
              {task.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 bg-muted/30 rounded-lg border border-dashed">
                  暂无评论
                </p>
              ) : (
                task.comments.map((c) => {
                  const isOwner = currentUser?.id === c.user.id;
                  const isEditing = editingId === c.id;
                  return (
                    <div
                      key={c.id}
                      className="rounded-lg border bg-card p-4 space-y-2 shadow-sm group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">
                              {getUserInitials(c.user)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground">
                            {formatUserName(c.user)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(c.createdAt).toLocaleString("zh-CN")}
                          </span>
                          {isOwner && !isEditing && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                title="编辑"
                                onClick={() => {
                                  setEditingId(c.id);
                                  setEditingContent(c.content);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-muted-foreground hover:text-rose-600"
                                title="删除"
                                disabled={deleteCommentMutation.isPending}
                                onClick={() => {
                                  if (confirm("确定要删除这条评论吗？")) {
                                    deleteCommentMutation.mutate({
                                      id: c.id,
                                      userId: currentUser!.id,
                                    });
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="pl-8 space-y-2">
                          <Textarea
                            rows={3}
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="resize-none shadow-sm"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(null);
                                setEditingContent("");
                              }}
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              取消
                            </Button>
                            <Button
                              size="sm"
                              disabled={
                                !editingContent.trim() ||
                                editingContent.trim() === c.content ||
                                updateCommentMutation.isPending
                              }
                              onClick={() =>
                                updateCommentMutation.mutate({
                                  id: c.id,
                                  userId: currentUser!.id,
                                  content: editingContent.trim(),
                                })
                              }
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              保存
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground pl-8">
                          {c.content}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            {currentUser && (
              <div className="space-y-3 pt-2">
                <Textarea
                  placeholder="发表评论..."
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="resize-none shadow-sm"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={!comment.trim() || commentMutation.isPending}
                    onClick={() =>
                      commentMutation.mutate({
                        taskId: task.id,
                        userId: currentUser.id,
                        content: comment.trim(),
                      })
                    }
                    className="shadow-none"
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    {commentMutation.isPending ? "发送中..." : "发送"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator className="bg-border/50" />

          {/* Notification history */}
          <div className="space-y-4 pb-6">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Bell className="h-4 w-4 text-muted-foreground" />
              通知记录 ({task.notifications.length})
            </div>
            {task.notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6 bg-muted/30 rounded-lg border border-dashed">
                暂无通知记录
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {task.notifications.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-lg border bg-card p-3 space-y-2 text-sm shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{n.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(n.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">{n.content}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge variant="secondary" className="text-[10px] font-normal shadow-none">
                        {NOTIFICATION_TYPE_LABEL[n.type as keyof typeof NOTIFICATION_TYPE_LABEL] || n.type}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-normal shadow-none bg-background">
                        {NOTIFICATION_CHANNEL_LABEL[n.channel as keyof typeof NOTIFICATION_CHANNEL_LABEL] || n.channel}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-normal shadow-none bg-background",
                          n.status === "failed"
                            ? "border-rose-200 text-rose-700 bg-rose-50/50"
                            : n.status === "sent" || n.status === "read"
                            ? "border-emerald-200 text-emerald-700 bg-emerald-50/50"
                            : "border-amber-200 text-amber-700 bg-amber-50/50"
                        )}
                      >
                        {NOTIFICATION_STATUS_LABEL[n.status] || n.status}
                      </Badge>
                    </div>
                    {n.error && (
                      <p className="text-rose-600 text-xs mt-1.5 bg-rose-50 p-1.5 rounded-md">
                        错误：{n.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center">
      <div className="w-[100px] shrink-0 text-sm text-muted-foreground">
        {label}
      </div>
      <div className="flex-1 text-sm flex items-center">
        {children}
      </div>
    </div>
  );
}
