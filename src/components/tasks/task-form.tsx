"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { X, Plus, Calendar as CalendarIcon } from "lucide-react";
import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TASK_TYPE_LABEL,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

interface UserItem {
  id: string;
  name: string;
  email: string;
}

interface ExistingTask {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  progress: number;
  tags: string[];
  estimatedHours: number | null;
  actualHours: number | null;
  creator: { id: string; name: string };
  assigneeId: string | null;
}

interface TaskFormValues {
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string;
  progress: number;
  tags: string[];
  estimatedHours: string;
  actualHours: string;
  assigneeId: string;
}

async function fetchUsers() {
  const res = await fetch("/api/users");
  if (!res.ok) return [];
  const data = await res.json();
  return data.users as UserItem[];
}

async function fetchTask(id: string): Promise<ExistingTask> {
  const res = await fetch(`/api/tasks/${id}`);
  if (!res.ok) throw new Error("Failed to fetch task");
  const data = await res.json();
  return data.task;
}

async function createTask(payload: Record<string, unknown>) {
  const res = await fetch("/api/tasks", {
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

async function updateTask(id: string, payload: Record<string, unknown>) {
  const res = await fetch(`/api/tasks/${id}`, {
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

function buildInitialValues(
  existing: ExistingTask | null | undefined,
  currentUserId?: string
): TaskFormValues {
  if (!existing) {
    return {
      title: "",
      description: "",
      type: "task",
      status: "todo",
      priority: "p2",
      deadline: "",
      progress: 0,
      tags: [],
      estimatedHours: "",
      actualHours: "",
      assigneeId: currentUserId || "",
    };
  }
  return {
    title: existing.title || "",
    description: existing.description || "",
    type: existing.type,
    status: existing.status,
    priority: existing.priority,
    deadline: existing.deadline || "",
    progress: existing.progress ?? 0,
    tags: existing.tags || [],
    estimatedHours:
      existing.estimatedHours != null ? String(existing.estimatedHours) : "",
    actualHours:
      existing.actualHours != null ? String(existing.actualHours) : "",
    assigneeId: existing.assigneeId || "",
  };
}

function TaskFormBody({
  taskId,
  existing,
  isLoading,
  users,
  onClose,
}: {
  taskId: string | null;
  existing: ExistingTask | null | undefined;
  isLoading: boolean;
  users: UserItem[];
  onClose: () => void;
}) {
  const currentUser = useAppStore((s) => s.currentUser);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!taskId;

  // Initialize form state from props — this is the lazy initializer pattern,
  // which avoids the React 19 setState-in-effect rule by deriving state at mount.
  const [form, setForm] = useState<TaskFormValues>(() =>
    buildInitialValues(existing, currentUser?.id)
  );
  const [tagInput, setTagInput] = useState("");

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "任务创建成功" });
      onClose();
    },
    onError: (e: Error) => {
      toast({
        title: "创建失败",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      updateTask(taskId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "任务已更新" });
      onClose();
    },
    onError: (e: Error) => {
      toast({
        title: "更新失败",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast({ title: "请填写任务名称", variant: "destructive" });
      return;
    }
    if (!currentUser) {
      toast({ title: "请先选择当前用户", variant: "destructive" });
      return;
    }

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      type: form.type,
      status: form.status,
      priority: form.priority,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      progress: form.progress,
      tags: form.tags,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : null,
      actualHours: form.actualHours ? Number(form.actualHours) : null,
      assigneeId: form.assigneeId || null,
    };

    if (!isEdit) {
      payload.creatorId = currentUser.id;
    }

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (form.tags.includes(t)) {
      setTagInput("");
      return;
    }
    setForm({ ...form, tags: [...form.tags, t] });
    setTagInput("");
  };

  if (isLoading) {
    return (
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>加载中...</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden" onKeyDown={handleKeyDown}>
      <DialogHeader className="px-6 py-4 border-b">
        <DialogTitle>{isEdit ? "编辑任务" : "新建任务"}</DialogTitle>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              任务名称 <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="title"
              className="text-base"
              placeholder="一句话描述这个任务/需求"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">任务描述</Label>
            <Textarea
              id="description"
              className="min-h-[120px] resize-y"
              placeholder="详细说明任务背景、目标、验收标准等"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Metadata Section (Type, Status, Priority, Assignee, Deadline, Progress) */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-2">
              <Label>类型</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as TaskType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TASK_TYPE_LABEL) as TaskType[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {TASK_TYPE_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>状态</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as TaskStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TASK_STATUS_LABEL) as TaskStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {TASK_STATUS_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>优先级</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm({ ...form, priority: v as TaskPriority })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TASK_PRIORITY_LABEL) as TaskPriority[]).map(
                    (k) => (
                      <SelectItem key={k} value={k}>
                        {TASK_PRIORITY_LABEL[k]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>责任人</Label>
              <Select
                value={form.assigneeId}
                onValueChange={(v) => setForm({ ...form, assigneeId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择责任人" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>截止时间</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.deadline && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.deadline ? (
                      format(new Date(form.deadline), "yyyy-MM-dd HH:mm", { locale: zhCN })
                    ) : (
                      <span>选择截止时间</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    locale={zhCN}
                    selected={form.deadline ? new Date(form.deadline) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const current = form.deadline ? new Date(form.deadline) : new Date();
                        date.setHours(current.getHours());
                        date.setMinutes(current.getMinutes());
                        setForm({ ...form, deadline: date.toISOString() });
                      } else {
                        setForm({ ...form, deadline: "" });
                      }
                    }}
                    initialFocus
                  />
                  <div className="p-3 border-t bg-muted/30 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground font-medium">时间</span>
                    <div className="flex items-center gap-2">
                      <Select
                        value={form.deadline ? format(new Date(form.deadline), "HH") : "00"}
                        onValueChange={(v) => {
                          const newDate = form.deadline ? new Date(form.deadline) : new Date();
                          newDate.setHours(parseInt(v, 10));
                          setForm({ ...form, deadline: newDate.toISOString() });
                        }}
                      >
                        <SelectTrigger className="h-8 w-[70px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")).map((h) => (
                            <SelectItem key={h} value={h} className="text-xs">
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground font-medium">:</span>
                      <Select
                        value={form.deadline ? format(new Date(form.deadline), "mm") : "00"}
                        onValueChange={(v) => {
                          const newDate = form.deadline ? new Date(form.deadline) : new Date();
                          newDate.setMinutes(parseInt(v, 10));
                          setForm({ ...form, deadline: newDate.toISOString() });
                        }}
                      >
                        <SelectTrigger className="h-8 w-[70px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0")).map((m) => (
                            <SelectItem key={m} value={m} className="text-xs">
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <Label>完成进度</Label>
                <span className="text-sm font-medium tabular-nums">
                  {form.progress}%
                </span>
              </div>
              <Slider
                value={[form.progress]}
                onValueChange={(v) => setForm({ ...form, progress: v[0] })}
                min={0}
                max={100}
                step={5}
                className="py-1"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>标签</Label>
            <div className="flex gap-2">
              <Input
                placeholder="输入标签后回车"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" size="icon" variant="outline" onClick={addTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {form.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="px-2 py-1 gap-1 text-sm font-normal">
                    {tag}
                    <button
                      type="button"
                      className="hover:bg-muted rounded-full p-0.5"
                      onClick={() =>
                        setForm({
                          ...form,
                          tags: form.tags.filter((t) => t !== tag),
                        })
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Estimated & actual hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated">预估工时</Label>
              <Input
                id="estimated"
                type="number"
                step="0.5"
                min="0"
                placeholder="如 8"
                value={form.estimatedHours}
                onChange={(e) =>
                  setForm({ ...form, estimatedHours: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actual">实际工时</Label>
              <Input
                id="actual"
                type="number"
                step="0.5"
                min="0"
                placeholder="如 6"
                value={form.actualHours}
                onChange={(e) =>
                  setForm({ ...form, actualHours: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="px-6 py-4 border-t bg-muted/20">
        <span className="text-xs text-muted-foreground flex items-center mr-auto">
          支持 <kbd className="mx-1.5 font-sans px-1.5 py-0.5 rounded-md border bg-background text-[10px]">⌘</kbd> + <kbd className="mx-1.5 font-sans px-1.5 py-0.5 rounded-md border bg-background text-[10px]">Enter</kbd> 快捷保存
        </span>
        <Button variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending || updateMutation.isPending}
          className="min-w-[100px]"
        >
          {createMutation.isPending || updateMutation.isPending
            ? "保存中..."
            : isEdit
            ? "保存修改"
            : "创建任务"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function TaskFormDialog() {
  const open = useAppStore((s) => s.taskFormOpen);
  const taskId = useAppStore((s) => s.taskFormId);
  const closeTaskForm = useAppStore((s) => s.closeTaskForm);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const isEdit = !!taskId;
  const { data: existingTask, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => fetchTask(taskId!),
    enabled: !!taskId && open,
  });

  // For create mode (no taskId), we render immediately with empty form.
  // For edit mode, we wait until existingTask is loaded, so the inner form's
  // useState lazy initializer picks up the actual task data — no effect needed.
  const showForm = open && (!isEdit || (!!existingTask && !isLoading));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) closeTaskForm();
      }}
    >
      {/* key forces remount when dialog opens — fresh form state each time */}
      {showForm && (
        <TaskFormBody
          key={taskId || "new"}
          taskId={taskId}
          existing={isEdit ? existingTask : null}
          isLoading={false}
          users={users}
          onClose={closeTaskForm}
        />
      )}
      {open && !showForm && (
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>加载中...</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
