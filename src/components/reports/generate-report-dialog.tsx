"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DateRange } from "react-day-picker";
import { endOfDay, format, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { REPORT_TYPE_LABEL, type ReportItem, type ReportType } from "./reports-page";

interface GenerateBody {
  type: ReportType;
  title?: string;
  startAt: string;
  endAt: string;
}

async function generateReport(body: GenerateBody) {
  const res = await fetch("/api/reports/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "生成报告失败");
  }
  return data.report as ReportItem;
}

function todayRange(): DateRange {
  const now = new Date();
  return { from: now, to: now };
}

function weekRange(): DateRange {
  const now = new Date();
  return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
}

function monthRange(): DateRange {
  const now = new Date();
  return { from: startOfMonth(now), to: now };
}

function buildDefaultName(
  userName: string,
  type: ReportType,
  range: DateRange | undefined
): string {
  const who = userName || "我";
  const label = REPORT_TYPE_LABEL[type];
  if (type === "daily") {
    return `${who} ${label} ${format(new Date(), "yyyy-MM-dd")}`;
  }
  if (range?.from && range?.to) {
    return `${who} ${label} ${format(range.from, "MM-dd")} ~ ${format(range.to, "MM-dd")}`;
  }
  return `${who} ${label} ${format(new Date(), "yyyy-MM-dd")}`;
}

export function GenerateReportDialog({
  onGenerated,
}: {
  onGenerated: (id: string) => void;
}) {
  const currentUser = useAppStore((s) => s.currentUser);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ReportType>("daily");
  const [range, setRange] = useState<DateRange | undefined>(() => todayRange());
  const [name, setName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);

  const userName = currentUser?.name ?? "";

  // 名称未被手动修改时，跟随类型/区间自动生成默认名称
  function syncDefaultName(nextType: ReportType, nextRange: DateRange | undefined) {
    if (!nameEdited) {
      setName(buildDefaultName(userName, nextType, nextRange));
    }
  }

  function fireRun(id: string) {
    // 不 await：仅触发后台生成，前端靠轮询刷新状态
    void fetch(`/api/reports/${id}/run`, { method: "POST" }).catch(() => {});
  }

  const mutation = useMutation({
    mutationFn: generateReport,
    onSuccess: (report) => {
      fireRun(report.id);
      queryClient.invalidateQueries({ queryKey: ["reports", currentUser?.id] });
      onGenerated(report.id);
      setOpen(false);
      toast({ title: "报告生成中", description: "生成完成后将自动刷新列表" });
    },
    onError: (e: Error) => {
      toast({
        title: "生成失败",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  function handleSubmit() {
    const title = (name.trim() || buildDefaultName(userName, type, range)).trim();
    const now = new Date();
    let startAt: Date;
    let endAt: Date;

    if (type === "daily") {
      startAt = startOfDay(now);
      endAt = now;
    } else if (type === "weekly") {
      startAt = startOfDay(startOfWeek(now, { weekStartsOn: 1 }));
      endAt = now;
    } else if (type === "monthly") {
      startAt = startOfMonth(now);
      endAt = now;
    } else {
      if (!range?.from || !range?.to) {
        toast({
          title: "请选择时间范围",
          description: "自定义报告需要在日历上选择开始与结束日期",
          variant: "destructive",
        });
        return;
      }
      startAt = startOfDay(range.from);
      endAt = endOfDay(range.to);
    }

    mutation.mutate({
      type,
      title,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // 打开时重置为默认状态与默认名称
      setType("daily");
      setRange(todayRange());
      setNameEdited(false);
        setDetailsOpen(false);
      setName(buildDefaultName(userName, "daily", todayRange()));
    }
  }

  const selectionLabel =
    range?.from && range?.to
      ? `${format(range.from, "yyyy-MM-dd")} ~ ${format(range.to, "yyyy-MM-dd")}`
      : range?.from
        ? `${format(range.from, "yyyy-MM-dd")} ~ 选择结束日期`
        : "请选择时间范围";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Sparkles className="h-4 w-4 mr-1.5" />
          生成报告
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>生成报告</DialogTitle>
          <DialogDescription>
            选择时间范围，AI 将基于该区间内的任务与进度生成报告。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="report-name" className="text-xs">
              报告名称
            </Label>
            <Input
              id="report-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameEdited(true);
              }}
              placeholder="请输入报告名称"
              className="h-8"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">报告类型</Label>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={type === "daily" ? "default" : "outline"}
                className="shadow-none"
                onClick={() => {
                  setType("daily");
                  const r = todayRange();
                  setRange(r);
                  syncDefaultName("daily", r);
                }}
              >
                日报
              </Button>
              <Button
                size="sm"
                variant={type === "weekly" ? "default" : "outline"}
                className="shadow-none"
                onClick={() => {
                  setType("weekly");
                  const r = weekRange();
                  setRange(r);
                  syncDefaultName("weekly", r);
                }}
              >
                周报
              </Button>
              <Button
                size="sm"
                variant={type === "monthly" ? "default" : "outline"}
                className="shadow-none"
                onClick={() => {
                  setType("monthly");
                  const r = monthRange();
                  setRange(r);
                  syncDefaultName("monthly", r);
                }}
              >
                月报
              </Button>
            </div>
          </div>

          <div className="flex justify-center rounded-md border p-1.5">
            <Calendar
              mode="range"
              selected={range}
              onSelect={(r) => {
                setRange(r);
                setType("custom");
                syncDefaultName("custom", r);
              }}
              numberOfMonths={1}
              weekStartsOn={1}
              locale={zhCN}
              formatters={{
                formatCaption: (date) => format(date, "yyyy 年 M 月"),
                formatWeekdayName: (date) =>
                  ["日", "一", "二", "三", "四", "五", "六"][date.getDay()],
              }}
              disabled={(date) => date > new Date()}
              autoFocus
              className="w-full p-1.5 [--cell-size:2.05rem]"
              classNames={{ root: "w-full" }}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground leading-relaxed">
              当前选择：
              <span className="text-foreground font-medium">{selectionLabel}</span>
            </p>

            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setDetailsOpen((v) => !v)}
              aria-expanded={detailsOpen}
            >
              总结详情
              {detailsOpen ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <div className="space-y-2">
            {detailsOpen && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                <div>
                  <p className="mb-1.5 font-medium text-foreground">统计区间：</p>
                  <p className="leading-relaxed">
                    统计区间均从开始日期的 0 点起算：日报从当天 0 点至现在；周报从本周一 0
                    点至现在；月报从本月 1 号 0 点至现在；自定义区间从开始日期 0 点至结束日期当天 23:59。
                  </p>
                </div>

                <div>
                  <p className="mb-2 font-medium text-foreground">
                    统计内容：
                  </p>
                  <ul className="space-y-1.5 leading-relaxed">
                      <li>• 负责人为你的新建任务、更新任务、完成/关闭任务。</li>
                      <li>• 你提交的过程记录，包括手动填写的进度描述和状态变更记录。</li>
                      <li>• 你负责的任务在该时间范围内收到的所有评论。</li>
                      <li>• 你负责且在该时间范围内创建或更新的项目。</li>
                    </ul>
                    <p className="mt-2 leading-relaxed">
                      系统只会把上述结构化记录提供给 AI，并要求 AI 不编造未提供的数据。
                    </p>
                  </div>
                </div>
              )}
            </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={mutation.isPending}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "生成中..." : "生成"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
