"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ListTodo,
  TrendingUp,
} from "lucide-react";
import {
  TASK_PRIORITY_COLOR,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_COLOR,
  TASK_STATUS_LABEL,
  TASK_TYPE_COLOR,
  TASK_TYPE_LABEL,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Stats {
  status: Record<TaskStatus, number>;
  priority: Record<TaskPriority, number>;
  type: Record<TaskType, number>;
  total: number;
  overdueCount: number;
  dueSoonCount: number;
  myOpenCount: number;
  myOverdueCount: number;
  upcoming: Array<{
    id: string;
    title: string;
    deadline: string;
    assignee?: { name: string } | null;
  }>;
  recentlyOverdue: Array<{
    id: string;
    title: string;
    deadline: string;
    assignee?: { name: string } | null;
  }>;
}

async function fetchStats(userId?: string): Promise<Stats> {
  const url = `/api/stats${userId ? `?userId=${userId}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export function Dashboard() {
  const currentUser = useAppStore((s) => s.currentUser);
  const setSelectedTaskId = useAppStore((s) => s.setSelectedTaskId);
  const openTaskForm = useAppStore((s) => s.openTaskForm);

  const { data, isLoading } = useQuery({
    queryKey: ["stats", currentUser?.id],
    queryFn: () => fetchStats(currentUser?.id),
    refetchInterval: 30_000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-28" />
          </Card>
        ))}
      </div>
    );
  }

  const statusOrder: TaskStatus[] = [
    "todo",
    "in_progress",
    "testing",
    "done",
    "closed",
  ];
  const priorityOrder: TaskPriority[] = ["p0", "p1", "p2", "p3"];
  const typeOrder: TaskType[] = ["requirement", "task", "bug"];

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="全部任务"
          value={data.total}
          icon={<ListTodo className="h-5 w-5" />}
          accent="text-foreground"
        />
        <StatCard
          label="即将到期（24h）"
          value={data.dueSoonCount}
          icon={<Clock className="h-5 w-5" />}
          accent="text-amber-600"
        />
        <StatCard
          label="已逾期"
          value={data.overdueCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="text-rose-600"
        />
        <StatCard
          label="我的待办"
          value={data.myOpenCount}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="text-emerald-600"
        />
      </div>

      {/* Distributions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">状态分布</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusOrder.map((s) => {
              const v = data.status[s] || 0;
              const pct = data.total > 0 ? (v / data.total) * 100 : 0;
              return (
                <div key={s} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <Badge
                      className={cn(
                        "border-0",
                        TASK_STATUS_COLOR[s]
                      )}
                    >
                      {TASK_STATUS_LABEL[s]}
                    </Badge>
                    <span className="font-medium tabular-nums">{v}</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">优先级分布</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {priorityOrder.map((p) => {
              const v = data.priority[p] || 0;
              const pct = data.total > 0 ? (v / data.total) * 100 : 0;
              return (
                <div key={p} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <Badge className={cn("border-0", TASK_PRIORITY_COLOR[p])}>
                      {TASK_PRIORITY_LABEL[p]}
                    </Badge>
                    <span className="font-medium tabular-nums">{v}</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">类型分布</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {typeOrder.map((t) => {
              const v = data.type[t] || 0;
              const pct = data.total > 0 ? (v / data.total) * 100 : 0;
              return (
                <div key={t} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <Badge className={cn("border-0", TASK_TYPE_COLOR[t])}>
                      {TASK_TYPE_LABEL[t]}
                    </Badge>
                    <span className="font-medium tabular-nums">{v}</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming & overdue lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              即将到期（按时间升序）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {data.upcoming.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-8 w-8 text-muted-foreground/50" />}
                text="暂无即将到期任务"
              />
            ) : (
              data.upcoming.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTaskId(t.id)}
                  className="w-full text-left rounded-md border p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="font-medium text-sm line-clamp-1">
                    {t.title}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(t.deadline).toLocaleString("zh-CN", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    <span>·</span>
                    <span>{t.assignee?.name || "未分配"}</span>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              已逾期任务
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {data.recentlyOverdue.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
                text="没有逾期任务，状态良好"
              />
            ) : (
              data.recentlyOverdue.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTaskId(t.id)}
                  className="w-full text-left rounded-md border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-3 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <div className="font-medium text-sm line-clamp-1">
                    {t.title}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="h-3 w-3" />
                    逾期于{" "}
                    {new Date(t.deadline).toLocaleString("zh-CN", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    <span>·</span>
                    <span>{t.assignee?.name || "未分配"}</span>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("mt-2 text-3xl font-bold tabular-nums", accent)}>
              {value}
            </p>
          </div>
          <div className={cn("rounded-lg bg-muted p-2", accent)}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      {icon}
      <p className="mt-2 text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
