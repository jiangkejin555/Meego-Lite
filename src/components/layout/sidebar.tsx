"use client";

import {
  LayoutDashboard,
  ListTodo,
  FolderKanban,
  Bell,
  Settings,
  Users,
  Plus,
} from "lucide-react";
import { useAppStore, type ViewKey } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

const NAV: { key: ViewKey; label: string; icon: React.ElementType }[] = [
  { key: "dashboard", label: "仪表盘", icon: LayoutDashboard },
  { key: "tasks", label: "我的任务", icon: ListTodo },
  { key: "projects", label: "我的项目", icon: FolderKanban },
  { key: "notifications", label: "通知中心", icon: Bell },
  { key: "users", label: "成员管理", icon: Users },
  { key: "settings", label: "通知设置", icon: Settings },
];

async function fetchUnread(userId: string) {
  const res = await fetch(
    `/api/notifications?userId=${userId}&unreadOnly=1`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.notifications as Array<{ id: string }>;
}

export function Sidebar() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const currentUser = useAppStore((s) => s.currentUser);
  const openTaskForm = useAppStore((s) => s.openTaskForm);

  const { data: unread } = useQuery({
    queryKey: ["unread", currentUser?.id],
    queryFn: () => (currentUser ? fetchUnread(currentUser.id) : []),
    enabled: !!currentUser,
    refetchInterval: 30_000,
  });

  const unreadCount = unread?.length ?? 0;

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 py-5 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
          M
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Meego Lite</span>
          <span className="text-[11px] text-muted-foreground">
            需求与任务协作
          </span>
        </div>
      </div>

      <div className="px-3 py-3">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => openTaskForm(null)}
        >
          <Plus className="h-4 w-4" />
          新建任务
        </Button>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = view === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                active &&
                  "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.key === "notifications" && unreadCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t px-3 py-3 text-[11px] text-muted-foreground">
        <p>v0.1 · 简版 Meego</p>
        <p className="mt-0.5">截止提醒：飞书 / 企微 / 邮箱</p>
      </div>
    </aside>
  );
}
