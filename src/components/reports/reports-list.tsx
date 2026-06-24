"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FileText, Search, CalendarIcon, X, Loader2, AlertCircle } from "lucide-react";
import { endOfDay, format, startOfDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import {
  REPORT_TYPE_LABEL,
  type ReportFilters,
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

function formatRange(startAt: string, endAt: string) {
  const fmt = (s: string) =>
    new Date(s).toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
    });
  return `${fmt(startAt)} ~ ${fmt(endAt)}`;
}

function ReportsListBody({
  reports,
  isLoading,
  selectedId,
  onSelect,
}: {
  reports: ReportItem[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="p-3 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">暂无报告</p>
        <p className="text-xs text-muted-foreground mt-1">
          调整筛选条件，或点击右上角「生成报告」
        </p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1">
      {reports.map((r) => {
        const active = r.id === selectedId;
        const pending = r.status === "pending";
        const failed = r.status === "failed";
        return (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={cn(
              "w-full rounded-md p-3 text-left transition-colors",
              "hover:bg-accent/60",
              active && "bg-accent",
              pending && "animate-pulse"
            )}
          >
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  "border-0 shadow-none text-[10px] font-medium",
                  TYPE_BADGE_CLASS[r.type]
                )}
              >
                {REPORT_TYPE_LABEL[r.type]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatRange(r.startAt, r.endAt)}
              </span>
            </div>
            <p className="mt-1.5 text-sm font-medium line-clamp-1">{r.title}</p>
            {pending ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                生成中...
              </p>
            ) : failed ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3 w-3" />
                生成失败
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {new Date(r.createdAt).toLocaleString("zh-CN")}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ReportsList({
  reports,
  isLoading,
  selectedId,
  onSelect,
  filters,
  onFiltersChange,
}: {
  reports: ReportItem[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  filters: ReportFilters;
  onFiltersChange: (next: ReportFilters) => void;
}) {
  // 本地输入，去抖后同步到上层（避免逐字触发请求）。
  const [searchInput, setSearchInput] = useState(filters.search);
  const [searchSync, setSearchSync] = useState(filters.search);
  if (searchSync !== filters.search) {
    setSearchSync(filters.search);
    setSearchInput(filters.search);
  }
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const dateRange: DateRange | undefined = filters.from
    ? {
        from: new Date(filters.from),
        to: filters.to ? new Date(filters.to) : undefined,
      }
    : undefined;

  const dateLabel =
    filters.from && filters.to
      ? `${format(new Date(filters.from), "MM-dd")} ~ ${format(
          new Date(filters.to),
          "MM-dd"
        )}`
      : "创建时间";

  const hasDateFilter = !!filters.from || !!filters.to;

  return (
    <>
      <div className="space-y-2 border-b px-3 py-3">
        <h2 className="text-sm font-semibold">报告列表</h2>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索标题或内容"
            className="h-8 pl-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={filters.type}
            onValueChange={(v) =>
              onFiltersChange({ ...filters, type: v as ReportFilters["type"] })
            }
          >
            <SelectTrigger size="sm" className="h-8 flex-1 text-xs">
              <SelectValue placeholder="类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="daily">日报</SelectItem>
              <SelectItem value="weekly">周报</SelectItem>
              <SelectItem value="monthly">月报</SelectItem>
              <SelectItem value="custom">自定义</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 flex-1 justify-start gap-1.5 px-2 text-xs font-normal shadow-none",
                  !hasDateFilter && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                <span className="truncate">{dateLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(r) =>
                  onFiltersChange({
                    ...filters,
                    from: r?.from ? startOfDay(r.from).toISOString() : undefined,
                    to: r?.to ? endOfDay(r.to).toISOString() : undefined,
                  })
                }
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
              />
            </PopoverContent>
          </Popover>
        </div>

        {hasDateFilter && (
          <button
            onClick={() =>
              onFiltersChange({ ...filters, from: undefined, to: undefined })
            }
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            清除时间筛选
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <ReportsListBody
          reports={reports}
          isLoading={isLoading}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </div>
    </>
  );
}
