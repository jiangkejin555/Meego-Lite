"use client";

import { useAppStore } from "@/store/app-store";
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  FileText,
  Bell,
  Settings,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export function HomePage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const setView = useAppStore((s) => s.setView);

  const features = [
    {
      key: "dashboard",
      title: "仪表盘",
      description: "全局概览，提供状态与优先级分布统计，快速定位即将到期与逾期任务。",
      icon: LayoutDashboard,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "hover:border-blue-500/30",
    },
    {
      key: "projects",
      title: "我的项目",
      description: "项目全生命周期管理，支持多用户协作、负责人分配、优先级与状态跟踪。",
      icon: FolderKanban,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      border: "hover:border-indigo-500/30",
    },
    {
      key: "tasks",
      title: "我的任务",
      description: "个人待办与任务协作，提供列表与看板两种展示模式，支持多维度过滤。",
      icon: ListTodo,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "hover:border-emerald-500/30",
    },
    {
      key: "reports",
      title: "我的报告",
      description: "一键生成智能工作总结，支持自定义区间与预设模板，可导出 Markdown 及 DOCX。",
      icon: FileText,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "hover:border-purple-500/30",
    },
    {
      key: "notifications",
      title: "通知中心",
      description: "任务变动与截止提醒，支持飞书、企业微信、邮件等多渠道集成通知。",
      icon: Bell,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "hover:border-amber-500/30",
    },
    {
      key: "profile",
      title: "个人设置",
      description: "账号安全管理、AI 大模型自定义配置及个性化总结模板设定。",
      icon: Settings,
      color: "text-slate-500",
      bg: "bg-slate-500/10",
      border: "hover:border-slate-500/30",
    },
  ] as const;

  return (
    <div className="relative min-h-[calc(100vh-10rem)] w-full overflow-hidden flex flex-col items-center justify-center">
      {/* Background Dynamic Effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        
        {/* Animated glowing orbs */}
        <div className="absolute top-[10%] left-[15%] w-[30%] h-[30%] rounded-full bg-primary/20 blur-[100px] animate-pulse mix-blend-multiply dark:mix-blend-screen" style={{ animationDuration: '6s' }} />
        <div className="absolute top-[30%] right-[15%] w-[25%] h-[25%] rounded-full bg-blue-500/20 blur-[100px] animate-pulse mix-blend-multiply dark:mix-blend-screen" style={{ animationDuration: '8s', animationDelay: '2s' }} />
        <div className="absolute bottom-[10%] left-[30%] w-[30%] h-[30%] rounded-full bg-purple-500/20 blur-[100px] animate-pulse mix-blend-multiply dark:mix-blend-screen" style={{ animationDuration: '7s', animationDelay: '4s' }} />
      </div>

      <div className="w-full max-w-5xl px-6 py-12 flex flex-col items-center text-center space-y-10 z-10">
        {/* Welcome Section */}
        <div className="space-y-4 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4 shadow-sm backdrop-blur-sm">
            🚀 欢迎回来
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            欢迎使用 <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">Meego Lite</span>, {currentUser?.name || "用户"}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            高效、极简的需求与任务协作系统，助你轻松管理工作流，聚焦核心目标。
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.key}
                onClick={() => setView(feature.key)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border bg-card p-6 text-left transition-all duration-300",
                  "hover:-translate-y-1.5 hover:shadow-xl cursor-pointer",
                  feature.border,
                  "animate-in fade-in zoom-in-95 duration-500 fill-mode-both"
                )}
                style={{ animationDelay: `${150 + idx * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("p-3 rounded-xl", feature.bg, feature.color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground/0 group-hover:text-primary transition-all duration-300 -translate-x-2 group-hover:translate-x-0" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
                
                {/* Subtle gradient hover effect inside card */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
