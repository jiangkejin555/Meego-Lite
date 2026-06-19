"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore } from "@/store/app-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, AlertTriangle } from "lucide-react";
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
import { useState } from "react";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  progress: number;
  tags: string[];
  creator: { id: string; name: string; deletedAt?: string | null };
  assignee: { id: string; name: string; deletedAt?: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

async function fetchTasks() {
  const res = await fetch("/api/tasks");
  if (!res.ok) throw new Error("Failed to fetch tasks");
  const data = await res.json();
  return data.tasks as TaskItem[];
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

function KanbanCard({
  task,
  onClick,
}: {
  task: TaskItem;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isOverdue =
    task.deadline &&
    new Date(task.deadline).getTime() < Date.now() &&
    task.status !== "done" &&
    task.status !== "closed";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-pointer rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow active:cursor-grabbing"
    >
      <div className="flex items-start gap-1.5 mb-2 flex-wrap">
        <Badge className={cn("border-0", TASK_PRIORITY_COLOR[task.priority])}>
          {TASK_PRIORITY_LABEL[task.priority]}
        </Badge>
      </div>
      <h4 className="text-sm font-medium line-clamp-2 mb-2">{task.title}</h4>
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mb-2">
          {task.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              className={cn("border-0 font-normal", tagColor(tag))}
            >
              {tag}
            </Badge>
          ))}
          {task.tags.length > 3 && (
            <span className="text-[11px] text-muted-foreground">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}
      {task.deadline && (
        <div
          className={cn(
            "flex items-center gap-1 text-[11px] mb-2",
            isOverdue
              ? "text-rose-600 font-medium"
              : "text-muted-foreground"
          )}
        >
          {isOverdue ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <Calendar className="h-3 w-3" />
          )}
          {new Date(task.deadline).toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}
      <div className="flex items-center justify-between">
        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[9px]">
                {getUserInitials(task.assignee)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] text-muted-foreground">
              {formatUserName(task.assignee)}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">未分配</span>
        )}
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {task.progress}%
        </span>
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
  onCardClick,
}: {
  status: TaskStatus;
  tasks: TaskItem[];
  onCardClick: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${status}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border bg-muted/30 min-h-[300px] w-[280px] shrink-0",
        isOver && "ring-2 ring-primary/40 bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Badge
            className={cn("border-0", TASK_STATUS_COLOR[status])}
          >
            {TASK_STATUS_LABEL[status]}
          </Badge>
          <span className="text-xs text-muted-foreground tabular-nums">
            {tasks.length}
          </span>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)]">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((t) => (
            <KanbanCard
              key={t.id}
              task={t}
              onClick={() => onCardClick(t.id)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="text-center py-8 text-xs text-muted-foreground">
            拖动卡片到这里
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskKanban({ tasks, isLoading }: { tasks: TaskItem[], isLoading: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const setSelectedTaskId = useAppStore((s) => s.setSelectedTaskId);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, TaskItem[]> = {
      todo: [],
      in_progress: [],
      paused: [],
      done: [],
      closed: [],
    };
    for (const t of tasks) {
      if (map[t.status]) map[t.status].push(t);
    }
    return map;
  }, [tasks]);

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      updateTaskStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (e: Error) => {
      toast({
        title: "状态更新失败",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const taskId = String(active.id);
    const overId = String(over.id);
    if (!overId.startsWith("col-")) return;
    const newStatus = overId.replace("col-", "") as TaskStatus;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    updateMutation.mutate({ id: taskId, status: newStatus });
    toast({
      title: "状态已更新",
      description: `${task.title} → ${TASK_STATUS_LABEL[newStatus]}`,
    });
  };

  const activeTask = activeId
    ? tasks.find((t) => t.id === activeId)
    : null;

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {TASK_STATUS_ORDER.map((s) => (
          <Skeleton key={s} className="h-[400px] w-[280px] rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {TASK_STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={grouped[status]}
            onCardClick={(id) => setSelectedTaskId(id)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-2 opacity-90">
            <KanbanCard
              task={activeTask}
              onClick={() => setSelectedTaskId(activeTask.id)}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
