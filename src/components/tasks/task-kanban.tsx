"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, AlertTriangle, Infinity as InfinityIcon } from "lucide-react";
import {
  TASK_PRIORITY_COLOR,
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_ORDER,
  TASK_STATUS_COLOR,
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
  tagColor,
  type KanbanGroupBy,
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
}

interface ProjectItem {
  id: string;
  name: string;
}

interface ColumnDef {
  key: string;
  label: string;
  colorClass?: string;
}

const UNASSIGNED_KEY = "__unassigned__";
const NO_PROJECT_KEY = "__none__";
const UNTAGGED_KEY = "__untagged__";

async function updateTaskField(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
}

function buildColumns(
  groupBy: KanbanGroupBy,
  tasks: TaskItem[],
  users: UserItem[],
  projects: ProjectItem[]
): ColumnDef[] {
  switch (groupBy) {
    case "status":
      return TASK_STATUS_ORDER.map((s) => ({
        key: s,
        label: TASK_STATUS_LABEL[s],
        colorClass: TASK_STATUS_COLOR[s],
      }));
    case "priority":
      return TASK_PRIORITY_ORDER.map((p) => ({
        key: p,
        label: TASK_PRIORITY_LABEL[p],
        colorClass: TASK_PRIORITY_COLOR[p],
      }));
    case "assignee": {
      const present = new Map<string, string>();
      for (const t of tasks) {
        if (t.assignee) present.set(t.assignee.id, formatUserName(t.assignee));
      }
      // Include all known users so cards can be reassigned to anyone.
      for (const u of users) {
        if (!present.has(u.id)) present.set(u.id, u.name);
      }
      const cols: ColumnDef[] = Array.from(present.entries())
        .sort((a, b) => a[1].localeCompare(b[1], "zh-CN"))
        .map(([key, label]) => ({ key, label }));
      cols.push({ key: UNASSIGNED_KEY, label: "未分配" });
      return cols;
    }
    case "project": {
      const present = new Map<string, string>();
      for (const t of tasks) {
        if (t.project) present.set(t.project.id, t.project.name);
      }
      for (const p of projects) {
        if (!present.has(p.id)) present.set(p.id, p.name);
      }
      const cols: ColumnDef[] = Array.from(present.entries())
        .sort((a, b) => a[1].localeCompare(b[1], "zh-CN"))
        .map(([key, label]) => ({ key, label }));
      cols.push({ key: NO_PROJECT_KEY, label: "暂不关联" });
      return cols;
    }
    case "tag": {
      const tags = new Set<string>();
      let hasUntagged = false;
      for (const t of tasks) {
        if (t.tags && t.tags.length > 0) {
          for (const tag of t.tags) tags.add(tag);
        } else {
          hasUntagged = true;
        }
      }
      const cols: ColumnDef[] = Array.from(tags)
        .sort((a, b) => a.localeCompare(b, "zh-CN"))
        .map((tag) => ({ key: tag, label: tag, colorClass: tagColor(tag) }));
      if (hasUntagged) cols.push({ key: UNTAGGED_KEY, label: "无标签" });
      return cols;
    }
  }
}

function taskColumnKeys(groupBy: KanbanGroupBy, task: TaskItem): string[] {
  switch (groupBy) {
    case "status":
      return [task.status];
    case "priority":
      return [task.priority];
    case "assignee":
      return [task.assignee ? task.assignee.id : UNASSIGNED_KEY];
    case "project":
      return [task.project ? task.project.id : NO_PROJECT_KEY];
    case "tag":
      return task.tags && task.tags.length > 0 ? task.tags : [UNTAGGED_KEY];
  }
}

interface KanbanEntry {
  sortableId: string;
  task: TaskItem;
}

function KanbanCard({
  sortableId,
  task,
  draggable,
  onClick,
}: {
  sortableId: string;
  task: TaskItem;
  draggable: boolean;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId, disabled: !draggable });

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
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow",
        draggable ? "cursor-pointer active:cursor-grabbing" : "cursor-pointer"
      )}
    >
      <div className="flex items-start gap-1.5 mb-2 flex-wrap">
        <Badge className={cn("border-0", TASK_PRIORITY_COLOR[task.priority])}>
          {TASK_PRIORITY_LABEL[task.priority]}
        </Badge>
        <Badge className={cn("border-0", TASK_STATUS_COLOR[task.status])}>
          {TASK_STATUS_LABEL[task.status]}
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
      {task.deadline ? (
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
      ) : (
        <div className="flex items-center gap-1 text-[11px] mb-2 text-muted-foreground">
          <InfinityIcon className="h-3 w-3" />
          长期
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
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  entries,
  draggable,
  onCardClick,
}: {
  column: ColumnDef;
  entries: KanbanEntry[];
  draggable: boolean;
  onCardClick: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${column.key}`,
    disabled: !draggable,
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border bg-muted/30 min-h-[300px] w-[280px] shrink-0",
        isOver && "ring-2 ring-primary/40 bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex min-w-0 items-center gap-2">
          {column.colorClass ? (
            <Badge className={cn("border-0", column.colorClass)}>
              <span className="max-w-[180px] truncate" title={column.label}>
                {column.label}
              </span>
            </Badge>
          ) : (
            <span
              className="max-w-[180px] truncate text-sm font-medium"
              title={column.label}
            >
              {column.label}
            </span>
          )}
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {entries.length}
          </span>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)]">
        <SortableContext
          items={entries.map((e) => e.sortableId)}
          strategy={verticalListSortingStrategy}
        >
          {entries.map((e) => (
            <KanbanCard
              key={e.sortableId}
              sortableId={e.sortableId}
              task={e.task}
              draggable={draggable}
              onClick={() => onCardClick(e.task.id)}
            />
          ))}
        </SortableContext>
        {entries.length === 0 && (
          <div className="text-center py-8 text-xs text-muted-foreground">
            {draggable ? "拖动卡片到这里" : "暂无任务"}
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskKanban({
  tasks,
  isLoading,
  groupBy = "status",
  users = [],
  projects = [],
}: {
  tasks: TaskItem[];
  isLoading: boolean;
  groupBy?: KanbanGroupBy;
  users?: UserItem[];
  projects?: ProjectItem[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const setSelectedTaskId = useAppStore((s) => s.setSelectedTaskId);
  const [activeId, setActiveId] = useState<string | null>(null);

  const draggable = groupBy !== "tag";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const columns = useMemo(
    () => buildColumns(groupBy, tasks, users, projects),
    [groupBy, tasks, users, projects]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, KanbanEntry[]>();
    for (const col of columns) map.set(col.key, []);
    for (const t of tasks) {
      for (const key of taskColumnKeys(groupBy, t)) {
        const bucket = map.get(key);
        if (!bucket) continue;
        bucket.push({
          sortableId: groupBy === "tag" ? `${t.id}::${key}` : t.id,
          task: t,
        });
      }
    }
    return map;
  }, [columns, tasks, groupBy]);

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      updateTaskField(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (e: Error) => {
      toast({
        title: "更新失败",
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
    if (!draggable) return;
    const { active, over } = e;
    if (!over) return;
    const taskId = String(active.id).split("::")[0];
    const overId = String(over.id);
    if (!overId.startsWith("col-")) return;
    const targetKey = overId.slice("col-".length);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const currentKey = taskColumnKeys(groupBy, task)[0];
    if (currentKey === targetKey) return;

    const targetColumn = columns.find((c) => c.key === targetKey);
    if (!targetColumn) return;

    let body: Record<string, unknown>;
    switch (groupBy) {
      case "status":
        body = { status: targetKey as TaskStatus };
        break;
      case "priority":
        body = { priority: targetKey as TaskPriority };
        break;
      case "assignee":
        body = { assigneeId: targetKey === UNASSIGNED_KEY ? null : targetKey };
        break;
      case "project":
        body = { projectId: targetKey === NO_PROJECT_KEY ? null : targetKey };
        break;
      default:
        return;
    }

    updateMutation.mutate({ id: taskId, body });
    toast({
      title: "已更新",
      description: `${task.title} → ${targetColumn.label}`,
    });
  };

  const activeTaskId = activeId ? activeId.split("::")[0] : null;
  const activeTask = activeTaskId
    ? tasks.find((t) => t.id === activeTaskId)
    : null;

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[400px] w-[280px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 py-20 text-center text-sm text-muted-foreground">
        暂无任务
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
        {columns.map((col) => (
          <KanbanColumn
            key={col.key}
            column={col}
            entries={grouped.get(col.key) ?? []}
            draggable={draggable}
            onCardClick={(id) => setSelectedTaskId(id)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-2 opacity-90">
            <KanbanCard
              sortableId={activeId ?? activeTask.id}
              task={activeTask}
              draggable={draggable}
              onClick={() => setSelectedTaskId(activeTask.id)}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
