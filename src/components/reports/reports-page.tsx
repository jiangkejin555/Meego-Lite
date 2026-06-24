"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { ReportsList } from "./reports-list";
import { ReportDetail } from "./report-detail";
import { GenerateReportDialog } from "./generate-report-dialog";

export type ReportType = "daily" | "weekly" | "monthly" | "custom";

export type ReportStatus = "pending" | "done" | "failed";

export interface ReportItem {
  id: string;
  userId: string;
  type: ReportType;
  title: string;
  startAt: string;
  endAt: string;
  status: ReportStatus;
  error: string | null;
  content: string;
  meta: string | null;
  createdAt: string;
  updatedAt: string;
}

export const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  daily: "日报",
  weekly: "周报",
  monthly: "月报",
  custom: "自定义",
};

export interface ReportFilters {
  search: string;
  type: ReportType | "all";
  from?: string;
  to?: string;
}

async function fetchReports(filters: ReportFilters) {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const qs = params.toString();
  const res = await fetch(`/api/reports${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("加载报告失败");
  const data = await res.json();
  return data.reports as ReportItem[];
}

export function ReportsPage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const setView = useAppStore((s) => s.setView);
  const setProfileSection = useAppStore((s) => s.setProfileSection);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({
    search: "",
    type: "all",
  });

  // 轮询：存在 pending 报告时每 3 秒刷新，最多持续 120 秒后停止（超时需手动刷新）。
  const POLL_INTERVAL = 3000;
  const POLL_MAX_MS = 120000;
  const pollStartRef = useRef<number | null>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports", currentUser?.id, filters],
    queryFn: () => fetchReports(filters),
    enabled: !!currentUser,
    refetchInterval: (query) => {
      const list = query.state.data as ReportItem[] | undefined;
      const hasPending = !!list?.some((r) => r.status === "pending");
      if (!hasPending) {
        pollStartRef.current = null;
        return false;
      }
      const now = Date.now();
      if (pollStartRef.current === null) {
        pollStartRef.current = now;
      }
      if (now - pollStartRef.current >= POLL_MAX_MS) {
        return false;
      }
      return POLL_INTERVAL;
    },
  });

  const selected =
    reports.find((r) => r.id === selectedId) ?? reports[0] ?? null;

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-9rem)]">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold">我的报告</h1>
          <p className="text-sm text-muted-foreground">
            基于近期任务与进度，由 AI 生成日报 / 周报
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setProfileSection("report-settings");
              setView("profile");
            }}
          >
            <Settings className="h-4 w-4 mr-1.5" />
            报告设置
          </Button>
          <GenerateReportDialog onGenerated={(id) => setSelectedId(id)} />
        </div>
      </div>

      <div className="flex flex-1 min-h-0 gap-4">
        <div className="flex w-[320px] shrink-0 flex-col overflow-hidden rounded-lg border bg-card">
          <ReportsList
            reports={reports}
            isLoading={isLoading}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto rounded-lg border bg-card">
          <ReportDetail
            report={selected}
            onDeleted={() => setSelectedId(null)}
          />
        </div>
      </div>
    </div>
  );
}
