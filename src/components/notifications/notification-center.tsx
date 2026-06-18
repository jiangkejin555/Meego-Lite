"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  CheckCheck,
  Clock,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import {
  NOTIFICATION_CHANNEL_LABEL,
  NOTIFICATION_STATUS_LABEL,
  NOTIFICATION_TYPE_LABEL,
  type NotificationChannel,
  type NotificationType,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface NotificationItem {
  id: string;
  userId: string;
  taskId: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  content: string;
  status: string;
  error: string | null;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
  task: { id: string; title: string } | null;
}

async function fetchNotifications(userId: string) {
  const res = await fetch(`/api/notifications?userId=${userId}`);
  if (!res.ok) throw new Error("Failed to fetch");
  const data = await res.json();
  return data.notifications as NotificationItem[];
}

async function markRead(id: string) {
  await fetch(`/api/notifications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ read: true }),
  });
}

async function markAllRead(userId: string) {
  await fetch("/api/notifications/mark-all-read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
}

async function triggerCheck() {
  const res = await fetch("/api/notifications/check-deadlines", {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to trigger");
  return res.json();
}

const TYPE_ICON: Record<NotificationType, React.ElementType> = {
  deadline_reminder: Clock,
  assignment: UserCheck,
  status_change: RefreshCw,
  mention: Bell,
  comment: MessageSquare,
};

export function NotificationCenter() {
  const currentUser = useAppStore((s) => s.currentUser);
  const setSelectedTaskId = useAppStore((s) => s.setSelectedTaskId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", currentUser?.id],
    queryFn: () =>
      currentUser ? fetchNotifications(currentUser.id) : Promise.resolve([]),
    enabled: !!currentUser,
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", currentUser?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["unread", currentUser?.id] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllRead(currentUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", currentUser?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["unread", currentUser?.id] });
      toast({ title: "已全部标记为已读" });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: triggerCheck,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", currentUser?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({
        title: "扫描完成",
        description: `检查 ${data.checkedTasks} 个任务，发送 ${data.sentCount} 条提醒`,
      });
    },
    onError: () => {
      toast({ title: "扫描失败", variant: "destructive" });
    },
  });

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          请先在顶部选择当前用户
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          共 {notifications.length} 条通知
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending}
            className="gap-1.5"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                triggerMutation.isPending && "animate-spin"
              )}
            />
            扫描截止时间
          </Button>
          <Button
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="gap-1.5"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            全部已读
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                暂无通知
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                当任务分配给你或截止时间临近时，通知会显示在这里
              </p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((n) => {
            const Icon = TYPE_ICON[n.type] || Bell;
            const unread =
              n.channel === "in_app" &&
              (n.status === "pending" || n.status === "sent");
            return (
              <Card
                key={n.id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-accent/30",
                  unread && "border-primary/40 bg-primary/5"
                )}
                onClick={() => {
                  if (n.taskId) setSelectedTaskId(n.taskId);
                  if (unread) markReadMutation.mutate(n.id);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "rounded-full p-2 shrink-0",
                        n.type === "deadline_reminder"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          : n.type === "assignment"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm line-clamp-1">
                          {n.title}
                        </p>
                        {unread && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {n.content}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Badge variant="outline" className="text-[10px]">
                          {NOTIFICATION_CHANNEL_LABEL[n.channel]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            n.status === "failed"
                              ? "border-rose-300 text-rose-700"
                              : n.status === "sent" || n.status === "read"
                              ? "border-emerald-300 text-emerald-700"
                              : "border-amber-300 text-amber-700"
                          )}
                        >
                          {n.status === "failed" && (
                            <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                          )}
                          {NOTIFICATION_STATUS_LABEL[n.status]}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString("zh-CN")}
                        </span>
                      </div>
                      {n.error && (
                        <p className="text-[11px] text-rose-600 mt-1">
                          错误：{n.error}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
