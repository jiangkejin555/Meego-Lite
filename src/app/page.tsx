"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Dashboard } from "@/components/dashboard/dashboard";
import { TasksPage } from "@/components/tasks/tasks-page";
import { ProjectsPage } from "@/components/projects/projects-page";
import { TaskFormDialog } from "@/components/tasks/task-form";
import { TaskDetailDrawer } from "@/components/tasks/task-detail";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { UserManagement } from "@/components/users/user-management";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";

async function seedIfNeeded() {
  // First check if any users exist
  const res = await fetch("/api/users");
  const data = await res.json();
  if (data.users && data.users.length === 0) {
    // Seed
    await fetch("/api/seed", { method: "POST" });
    return true;
  }
  return false;
}

async function triggerDeadlineCheck() {
  try {
    await fetch("/api/notifications/check-deadlines", { method: "POST" });
  } catch {
    // silent
  }
}

export default function Home() {
  const view = useAppStore((s) => s.view);
  const currentUser = useAppStore((s) => s.currentUser);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Initial seed
  const { data: seeded } = useQuery({
    queryKey: ["initial-seed"],
    queryFn: seedIfNeeded,
    staleTime: Infinity,
  });

  // Auto-pick first user as current user if none is selected.
  // Runs whenever `seeded` finishes (or on mount if no seeding needed).
  useEffect(() => {
    if (currentUser) return;
    let cancelled = false;
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.users && data.users.length > 0) {
          setCurrentUser({
            id: data.users[0].id,
            name: data.users[0].name,
            email: data.users[0].email,
            avatar: data.users[0].avatar,
          });
        }
      })
      .catch(() => {
        /* silent */
      });
    return () => {
      cancelled = true;
    };
  }, [seeded, currentUser, setCurrentUser]);

  // Show seed toast once after initial seeding
  useEffect(() => {
    if (seeded) {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "已加载示例数据" });
    }
  }, [seeded, queryClient, toast]);

  // Periodic deadline check (every 5 minutes)
  useEffect(() => {
    if (!currentUser) return;
    // Trigger once on mount
    triggerDeadlineCheck().then(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread"] });
    });
    const interval = setInterval(() => {
      triggerDeadlineCheck().then(() => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["unread"] });
      });
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser, queryClient]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          <div className="mx-auto max-w-7xl">
            {view === "dashboard" && <Dashboard />}
            {view === "tasks" && <TasksPage />}
            {view === "projects" && <ProjectsPage />}
            {view === "notifications" && <NotificationCenter />}
            {view === "settings" && <NotificationSettings />}
            {view === "users" && <UserManagement />}
          </div>
        </main>
        <footer className="mt-auto shrink-0 border-t py-3 px-6 text-xs text-muted-foreground text-center">
          Meego Lite · 简版需求与任务协作系统 · 通知支持飞书 / 企业微信 / 邮箱
        </footer>
      </div>

      {/* Global modals */}
      <TaskFormDialog />
      <TaskDetailDrawer />
    </div>
  );
}
