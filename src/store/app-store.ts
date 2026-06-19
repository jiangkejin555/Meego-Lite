"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TaskStatus, TaskPriority } from "@/lib/constants";

export type ViewKey =
  | "dashboard"
  | "tasks"
  | "projects"
  | "notifications"
  | "settings"
  | "users";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

interface TaskFilter {
  search: string;
  tag: string | "all";
  status: TaskStatus | "all";
  priority: TaskPriority | "all";
  assigneeId: string | "all";
  creatorId: string | "all";
  projectId: string | "all";
}

interface AppState {
  // Current logged-in user (simulated — picked from users list)
  currentUser: CurrentUser | null;
  setCurrentUser: (u: CurrentUser | null) => void;

  // Active view
  view: ViewKey;
  setView: (v: ViewKey) => void;

  // Filters
  filter: TaskFilter;
  setFilter: (patch: Partial<TaskFilter>) => void;
  resetFilter: () => void;

  // Selected task detail drawer
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;

  // Task form modal
  taskFormOpen: boolean;
  taskFormId: string | null; // null = create mode
  openTaskForm: (id?: string | null) => void;
  closeTaskForm: () => void;
}

const defaultFilter: TaskFilter = {
  search: "",
  tag: "all",
  status: "all",
  priority: "all",
  assigneeId: "all",
  creatorId: "all",
  projectId: "all",
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: null,
      setCurrentUser: (u) => set({ currentUser: u }),

      view: "dashboard",
      setView: (v) => set({ view: v }),

      filter: defaultFilter,
      setFilter: (patch) => set((s) => ({ filter: { ...s.filter, ...patch } })),
      resetFilter: () => set({ filter: defaultFilter }),

      selectedTaskId: null,
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),

      taskFormOpen: false,
      taskFormId: null,
      openTaskForm: (id = null) => set({ taskFormOpen: true, taskFormId: id }),
      closeTaskForm: () => set({ taskFormOpen: false, taskFormId: null }),
    }),
    {
      name: "meego-lite-storage", // localStorage 里的 key
      storage: createJSONStorage(() => localStorage),
      // 只有这些字段会被持久化，避免把 filter, modal状态 也缓存下来
      partialize: (state) => ({ currentUser: state.currentUser, view: state.view }),
    }
  )
);
