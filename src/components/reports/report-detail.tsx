"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/ui/markdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { Pencil, Trash2, Download, Check, X, FileText, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { exportMarkdown, exportDocx } from "@/lib/report-export";
import {
  REPORT_TYPE_LABEL,
  type ReportItem,
  type ReportType,
} from "./reports-page";

const TYPE_BADGE_CLASS: Record<ReportType, string> = {
  daily: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  weekly:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  monthly:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  custom: "bg-muted text-muted-foreground",
};

async function patchReport(id: string, body: { title?: string; content?: string }) {
  const res = await fetch(`/api/reports/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "保存失败");
  }
  return res.json();
}

async function deleteReport(id: string) {
  const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "删除失败");
  }
  return res.json();
}

export function ReportDetail({
  report,
  onDeleted,
}: {
  report: ReportItem | null;
  onDeleted: () => void;
}) {
  const currentUser = useAppStore((s) => s.currentUser);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(report?.content ?? "");
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Reset edit state when the selected report (or its content) changes.
  const [syncKey, setSyncKey] = useState(`${report?.id ?? ""}:${report?.content ?? ""}`);
  const nextSyncKey = `${report?.id ?? ""}:${report?.content ?? ""}`;
  if (nextSyncKey !== syncKey) {
    setSyncKey(nextSyncKey);
    setEditing(false);
    setDraft(report?.content ?? "");
  }

  const saveMutation = useMutation({
    mutationFn: (content: string) => patchReport(report!.id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports", currentUser?.id] });
      setEditing(false);
      toast({ title: "报告已保存" });
    },
    onError: (e: Error) => {
      toast({ title: "保存失败", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteReport(report!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports", currentUser?.id] });
      setDeleteOpen(false);
      onDeleted();
      toast({ title: "报告已删除" });
    },
    onError: (e: Error) => {
      toast({ title: "删除失败", description: e.message, variant: "destructive" });
    },
  });

  if (!report) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">选择左侧报告查看详情</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-6 py-4">
        <div className="min-w-[200px] flex-1">
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                "border-0 shadow-none text-[10px] font-medium",
                TYPE_BADGE_CLASS[report.type]
              )}
            >
              {REPORT_TYPE_LABEL[report.type]}
            </Badge>
            <h2 className="text-base font-semibold truncate">{report.title}</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(report.startAt).toLocaleString("zh-CN")} ~{" "}
            {new Date(report.endAt).toLocaleString("zh-CN")}
            <span className="mx-2">·</span>
            更新于 {new Date(report.updatedAt).toLocaleString("zh-CN")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {report.status === "pending" ? (
            <span className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              生成中...
            </span>
          ) : report.status === "failed" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 shadow-none text-rose-600 hover:text-rose-700"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              删除
            </Button>
          ) : editing ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => {
                  setEditing(false);
                  setDraft(report.content);
                }}
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                取消
              </Button>
              <Button
                size="sm"
                className="h-8"
                disabled={
                  !draft.trim() ||
                  draft === report.content ||
                  saveMutation.isPending
                }
                onClick={() => saveMutation.mutate(draft)}
              >
                <Check className="h-3.5 w-3.5 mr-1.5" />
                {saveMutation.isPending ? "保存中..." : "保存"}
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 shadow-none"
                onClick={() => {
                  setDraft(report.content);
                  setEditing(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                编辑
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 shadow-none">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    导出
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportMarkdown(report)}>
                    Markdown (.md)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void exportDocx(report)}>
                    Word (.docx)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="sm"
                variant="outline"
                className="h-8 shadow-none text-rose-600 hover:text-rose-700"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                删除
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {report.status === "pending" ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-muted-foreground">
              报告生成中，完成后将自动刷新...
            </p>
          </div>
        ) : report.status === "failed" ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <AlertCircle className="h-8 w-8 text-rose-500" />
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
              报告生成失败
            </p>
            {report.error && (
              <p className="max-w-md text-xs text-muted-foreground break-words">
                {report.error}
              </p>
            )}
          </div>
        ) : editing ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-[60vh] font-mono text-sm resize-none"
          />
        ) : (
          <Markdown>{report.content}</Markdown>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除该报告？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作不可撤销，报告内容将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => deleteMutation.mutate()}
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
