"use client";

import { create } from "zustand";
import type { TaskStatus, TaskType, TaskPriority } from "@/lib/constants";

export type ViewKey =
  | "dashboard"
  | "tasks"
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
  type: TaskType | "all";
  status: TaskStatus | "all";
  priority: TaskPriority | "all";
  assigneeId: string | "all";
  creatorId: string | "all";
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
  type: "all",
  status: "all",
  priority: "all",
  assigneeId: "all",
  creatorId: "all",
};

export const useAppStore = create<AppState>((set) => ({
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
}));
