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
import { ProfileSettings } from "@/components/settings/profile-settings";
import { useAppStore, type CurrentUser } from "@/store/app-store";

async function fetchMe(): Promise<CurrentUser | null> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) return null;
  const data = await res.json();
  return data.user as CurrentUser;
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

  // Hydrate the current user from the session. middleware already guards the
  // page, so an unauthenticated visitor is redirected to /login before reaching
  // here; this just syncs the store with the authenticated identity.
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (me && me.id !== currentUser?.id) {
      setCurrentUser(me);
    }
  }, [me, currentUser?.id, setCurrentUser]);

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
            {view === "profile" && <ProfileSettings />}
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
