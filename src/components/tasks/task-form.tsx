"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { formatUserName } from "@/lib/users";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  X,
  Plus,
  Calendar as CalendarIcon,
  RotateCcw,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";
import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  tagColor,
  type TaskPriority,
  type TaskStatus,
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
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  progress: number;
  tags: string[];
  estimatedHours: number | null;
  actualHours: number | null;
  creator: { id: string; name: string };
  assigneeId: string | null;
  projectId: string | null;
}

interface ProjectOption {
  id: string;
  name: string;
}

// Sentinel value for the "暂不关联" (no project) option, since Radix Select
// items can't use an empty string value.
const NO_PROJECT = "__none__";

interface TaskFormValues {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string;
  tags: string[];
  estimatedHours: string;
  actualHours: string;
  assigneeId: string;
  projectId: string;
}

async function fetchUsers() {
  const res = await fetch("/api/users");
  if (!res.ok) return [];
  const data = await res.json();
  return data.users as UserItem[];
}

async function fetchProjectOptions(): Promise<ProjectOption[]> {
  const res = await fetch("/api/projects");
  if (!res.ok) return [];
  const data = await res.json();
  return (data.projects as Array<{ id: string; name: string }>).map((p) => ({
    id: p.id,
    name: p.name,
  }));
}

async function fetchTags() {
  const res = await fetch("/api/tags");
  if (!res.ok) return [];
  const data = await res.json();
  return data.tags as string[];
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
      status: "todo",
      priority: "p2",
      deadline: "",
      tags: [],
      estimatedHours: "",
      actualHours: "",
      assigneeId: currentUserId || "",
      projectId: NO_PROJECT,
    };
  }
  return {
    title: existing.title || "",
    description: existing.description || "",
    status: existing.status,
    priority: existing.priority,
    deadline: existing.deadline || "",
    tags: existing.tags || [],
    estimatedHours:
      existing.estimatedHours != null ? String(existing.estimatedHours) : "",
    actualHours:
      existing.actualHours != null ? String(existing.actualHours) : "",
    assigneeId: existing.assigneeId || "",
    projectId: existing.projectId || NO_PROJECT,
  };
}

// localStorage 草稿：仅用于新建任务，防止弹窗关闭/刷新后丢失已填内容。
const DRAFT_KEY = "meego:task-draft:new";
const DRAFT_VERSION = 2;

interface StoredDraft {
  v: number;
  values: TaskFormValues;
}

function isTaskFormValues(x: unknown): x is TaskFormValues {
  if (!x || typeof x !== "object") return false;
  const v = x as Record<string, unknown>;
  return (
    typeof v.title === "string" &&
    typeof v.description === "string" &&
    typeof v.status === "string" &&
    typeof v.priority === "string" &&
    typeof v.deadline === "string" &&
    Array.isArray(v.tags) &&
    typeof v.estimatedHours === "string" &&
    typeof v.actualHours === "string" &&
    typeof v.assigneeId === "string" &&
    typeof v.projectId === "string"
  );
}

function readDraft(): TaskFormValues | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    if (parsed?.v !== DRAFT_VERSION || !isTaskFormValues(parsed.values)) {
      window.localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed.values;
  } catch {
    return null;
  }
}

function writeDraft(values: TaskFormValues) {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredDraft = { v: DRAFT_VERSION, values };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // 忽略写入异常（隐私模式 / 配额超限）
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

// 草稿是否“有实质内容”，避免空表单也提示恢复。
function isDraftMeaningful(values: TaskFormValues): boolean {
  return (
    values.title.trim() !== "" ||
    values.description.trim() !== "" ||
    values.tags.length > 0 ||
    values.deadline !== "" ||
    values.estimatedHours !== "" ||
    values.actualHours !== ""
  );
}

// ===== 进度更新（完成进度）独立模块 =====
// 该区域为进度的唯一写入入口，所有增删改均独立、即时提交（自己的 fetch），
// 不依赖表单底部的“保存”按钮。

interface ProgressUpdateItem {
  id: string;
  content: string;
  percent: number | null;
  createdAt: string;
  user: { id: string; name: string; deletedAt?: string | null };
}

const PERCENT_PRESETS = [0, 25, 50, 75, 100];

async function fetchProgressUpdates(
  taskId: string
): Promise<ProgressUpdateItem[]> {
  const res = await fetch(`/api/progress?taskId=${taskId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.updates as ProgressUpdateItem[];
}

async function createProgressUpdate(payload: {
  taskId: string;
  userId: string;
  content: string;
  percent?: number;
}) {
  const res = await fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "添加失败");
  }
  return res.json();
}

async function patchProgressUpdate(
  id: string,
  payload: { userId: string; content?: string; percent?: number | null }
) {
  const res = await fetch(`/api/progress/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "修改失败");
  }
  return res.json();
}

async function deleteProgressUpdate(id: string, userId: string) {
  const res = await fetch(`/api/progress/${id}?userId=${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "删除失败");
  }
  return res.json();
}

// 百分比快捷选择 + 手动输入。percent 为 "" 表示不更新百分比。
function PercentPicker({
  percent,
  onChange,
}: {
  percent: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">百分比（可选）</p>
      <div className="flex flex-wrap items-center gap-2">
        {PERCENT_PRESETS.map((p) => {
          const selected = percent !== "" && Number(percent) === p;
          return (
            <Button
              key={p}
              type="button"
              size="sm"
              variant={selected ? "default" : "outline"}
              className="h-7 px-2.5"
              onClick={() => onChange(selected ? "" : String(p))}
            >
              {p}%
            </Button>
          );
        })}
        <Input
          type="number"
          min={0}
          max={100}
          placeholder="自定义"
          className="h-7 w-20"
          value={percent}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

// 将百分比字符串转换为提交用的数值，空字符串返回 undefined（不更新进度）。
function parsePercent(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  if (Number.isNaN(n)) return undefined;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function ProgressSection({ taskId }: { taskId: string | null }) {
  const currentUser = useAppStore((s) => s.currentUser);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newContent, setNewContent] = useState("");
  const [newPercent, setNewPercent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingPercent, setEditingPercent] = useState("");

  const { data: updates = [] } = useQuery({
    queryKey: ["progress", taskId],
    queryFn: () => fetchProgressUpdates(taskId!),
    enabled: !!taskId,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["progress", taskId] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const addMutation = useMutation({
    mutationFn: createProgressUpdate,
    onSuccess: () => {
      setNewContent("");
      setNewPercent("");
      invalidateAll();
      toast({ title: "进度已添加" });
    },
    onError: (e: Error) => {
      toast({ title: "添加失败", description: e.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({
      id,
      userId,
      content,
      percent,
    }: {
      id: string;
      userId: string;
      content: string;
      percent?: number;
    }) => patchProgressUpdate(id, { userId, content, percent }),
    onSuccess: () => {
      setEditingId(null);
      setEditingContent("");
      setEditingPercent("");
      invalidateAll();
      toast({ title: "进度已更新" });
    },
    onError: (e: Error) => {
      toast({ title: "修改失败", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      deleteProgressUpdate(id, userId),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "进度已删除" });
    },
    onError: (e: Error) => {
      toast({ title: "删除失败", description: e.message, variant: "destructive" });
    },
  });

  // 新建任务时（无 taskId）不能写进度，给出提示。
  if (!taskId) {
    return (
      <div className="space-y-2">
        <Label>完成进度</Label>
        <p className="text-xs text-muted-foreground">
          保存任务后可在编辑页填写进度更新
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>完成进度</Label>

      {/* 新增进度 */}
      {currentUser && (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <Textarea
            className="min-h-[72px] resize-y bg-background"
            placeholder="填写本次进度，例如：今天发了 A/B/C 三个红人的影片，还剩 7 个"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
          />
          <PercentPicker percent={newPercent} onChange={setNewPercent} />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={!newContent.trim() || addMutation.isPending}
              onClick={() =>
                addMutation.mutate({
                  taskId,
                  userId: currentUser.id,
                  content: newContent.trim(),
                  percent: parsePercent(newPercent),
                })
              }
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {addMutation.isPending ? "添加中..." : "添加进度"}
            </Button>
          </div>
        </div>
      )}

      {/* 历史记录 */}
      {updates.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6 bg-muted/30 rounded-lg border border-dashed">
          暂无进度记录
        </p>
      ) : (
        <div className="space-y-3">
          {updates.map((u) => {
            const isOwner = currentUser?.id === u.user.id;
            const isEditing = editingId === u.id;
            return (
              <div
                key={u.id}
                className="rounded-lg border bg-card p-3 space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {formatUserName(u.user)}
                    </span>
                    {u.percent != null && (
                      <Badge variant="secondary" className="text-[10px] font-normal shadow-none tabular-nums">
                        {u.percent}%
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleString("zh-CN")}
                    </span>
                    {isOwner && !isEditing && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          title="编辑"
                          onClick={() => {
                            setEditingId(u.id);
                            setEditingContent(u.content);
                            setEditingPercent(
                              u.percent != null ? String(u.percent) : ""
                            );
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-rose-600"
                          title="删除"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm("确定删除这条进度记录吗？")) {
                              deleteMutation.mutate({
                                id: u.id,
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
                  <div className="space-y-2">
                    <Textarea
                      className="min-h-[72px] resize-y bg-background"
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                    />
                    <PercentPicker
                      percent={editingPercent}
                      onChange={setEditingPercent}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditingContent("");
                          setEditingPercent("");
                        }}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        取消
                      </Button>
                      <Button
                        size="sm"
                        disabled={
                          !editingContent.trim() || editMutation.isPending
                        }
                        onClick={() =>
                          editMutation.mutate({
                            id: u.id,
                            userId: currentUser!.id,
                            content: editingContent.trim(),
                            percent: parsePercent(editingPercent),
                          })
                        }
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        保存
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
                    {u.content}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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

  // 新建模式下，挂载时一次性读取本地草稿（编辑模式忽略草稿，始终用服务端数据）。
  const restoredDraft = useMemo(
    () => (isEdit ? null : readDraft()),
    [isEdit]
  );

  // Initialize form state from props — this is the lazy initializer pattern,
  // which avoids the React 19 setState-in-effect rule by deriving state at mount.
  // 新建模式优先用恢复出的草稿。
  const [form, setForm] = useState<TaskFormValues>(() =>
    restoredDraft ?? buildInitialValues(existing, currentUser?.id)
  );
  const [tagInput, setTagInput] = useState("");
  // 顶部提示条：仅在确实恢复了“有内容”的草稿时显示。
  const [draftBannerVisible, setDraftBannerVisible] = useState(
    () => !!restoredDraft && isDraftMeaningful(restoredDraft)
  );

  // 防抖将表单写入 localStorage（仅新建模式）。
  useEffect(() => {
    if (isEdit) return;
    const timer = window.setTimeout(() => {
      if (isDraftMeaningful(form)) {
        writeDraft(form);
      } else {
        clearDraft();
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [form, isEdit]);

  const discardDraft = () => {
    clearDraft();
    setForm(buildInitialValues(null, currentUser?.id));
    setTagInput("");
    setDraftBannerVisible(false);
  };

  const { data: existingTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
  });

  const { data: projectOptions = [] } = useQuery({
    queryKey: ["project-options"],
    queryFn: fetchProjectOptions,
  });

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      clearDraft();
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
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
      queryClient.invalidateQueries({ queryKey: ["users"] });
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
      status: form.status,
      priority: form.priority,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      tags: form.tags,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : null,
      actualHours: form.actualHours ? Number(form.actualHours) : null,
      assigneeId: form.assigneeId || null,
      projectId: form.projectId === NO_PROJECT ? null : form.projectId,
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

  const addTag = (value?: string) => {
    const t = (value ?? tagInput).trim();
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
      <DialogContent className="sm:max-w-3xl">
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
    <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden" onKeyDown={handleKeyDown}>
      <DialogHeader className="px-6 py-4 border-b">
        <DialogTitle>{isEdit ? "编辑任务" : "新建任务"}</DialogTitle>
      </DialogHeader>

      {draftBannerVisible && (
        <div className="flex items-center gap-3 px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-200">
          <RotateCcw className="h-4 w-4 shrink-0" />
          <span className="text-sm flex-1">已恢复上次未完成的草稿</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-amber-900 hover:bg-amber-100 hover:text-amber-900 dark:text-amber-200 dark:hover:bg-amber-900/40"
            onClick={discardDraft}
          >
            清空重填
          </Button>
        </div>
      )}

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

          {/* Metadata Section (Status, Priority, Assignee, Deadline, Progress) */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
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
              <Label>关联项目</Label>
              <Select
                value={form.projectId}
                onValueChange={(v) => setForm({ ...form, projectId: v })}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]">
                  <SelectItem value={NO_PROJECT}>暂不关联</SelectItem>
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id} title={p.name}>
                      <span className="block max-w-[calc(var(--radix-select-trigger-width)-3rem)] truncate">
                        {p.name}
                      </span>
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
          </div>

          {/* 完成进度 / 进度更新 —— 独立保存，不随表单保存按钮提交 */}
          <ProgressSection taskId={taskId} />

          {/* Tags */}
          <div className="space-y-2">
            <Label>标签</Label>
            <div className="flex gap-2">
              <Input
                placeholder="输入标签后回车，或从下方选择已有标签"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" size="icon" variant="outline" onClick={() => addTag()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {form.tags.map((tag) => (
                  <Badge
                    key={tag}
                    className={cn("border-0 shadow-none px-2 py-1 gap-1 text-sm font-normal", tagColor(tag))}
                  >
                    {tag}
                    <button
                      type="button"
                      className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
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
            {existingTags.filter((t) => !form.tags.includes(t)).length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs text-muted-foreground">已有标签</p>
                <div className="flex flex-wrap gap-2">
                  {existingTags
                    .filter((t) => !form.tags.includes(t))
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTag(tag)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-normal transition-opacity hover:opacity-80",
                          tagColor(tag)
                        )}
                      >
                        <Plus className="h-3 w-3" />
                        {tag}
                      </button>
                    ))}
                </div>
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
        <DialogContent className="sm:max-w-3xl">
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
