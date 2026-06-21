"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  ListTodo,
  FolderKanban,
  Bell,
  Settings,
  Users,
  Menu,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserInitials } from "@/lib/users";
import { useQuery } from "@tanstack/react-query";
import type { ViewKey } from "@/store/app-store";

const NAV: { key: ViewKey; label: string; icon: React.ElementType }[] = [
  { key: "dashboard", label: "仪表盘", icon: LayoutDashboard },
  { key: "tasks", label: "我的任务", icon: ListTodo },
  { key: "projects", label: "我的项目", icon: FolderKanban },
  { key: "notifications", label: "通知中心", icon: Bell },
  { key: "users", label: "成员管理", icon: Users },
  { key: "settings", label: "通知设置", icon: Settings },
];

async function fetchUsers() {
  const res = await fetch("/api/users");
  if (!res.ok) return [];
  const data = await res.json();
  return data.users as Array<{ id: string; name: string; email: string }>;
}

type UserIdentity = { id: string };

export function shouldClearCurrentUser(
  currentUser: UserIdentity | null,
  users: UserIdentity[],
  usersLoaded: boolean
) {
  return (
    !!currentUser &&
    usersLoaded &&
    !users.some((user) => user.id === currentUser.id)
  );
}

export function Header() {
  const currentUser = useAppStore((s) => s.currentUser);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const setView = useAppStore((s) => s.setView);
  const openTaskForm = useAppStore((s) => s.openTaskForm);
  const view = useAppStore((s) => s.view);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: users = [], isFetched: usersFetched } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  useEffect(() => {
    if (shouldClearCurrentUser(currentUser, users, usersFetched)) {
      setCurrentUser(null);
    }
  }, [currentUser, setCurrentUser, users, usersFetched]);

  const viewLabel = NAV.find((n) => n.key === view)?.label || "";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Mobile nav */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="px-5 py-4 border-b flex flex-row items-center justify-between space-y-0">
            <SheetTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
                M
              </div>
              Meego Lite
            </SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </SheetClose>
          </SheetHeader>
          <div className="p-3">
            <Button
              className="w-full justify-start gap-2"
              onClick={() => {
                openTaskForm(null);
                setMobileOpen(false);
              }}
            >
              <Plus className="h-4 w-4" />
              新建任务
            </Button>
          </div>
          <nav className="px-2 space-y-0.5">
            {NAV.map((item) => {
              const active = view === item.key;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setView(item.key);
                    setMobileOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    active && "bg-accent text-accent-foreground font-medium"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      <h1 className="text-base font-semibold flex-1">{viewLabel}</h1>

      <Select
        value={currentUser?.id || ""}
        onValueChange={(v) => {
          const u = users.find((x) => x.id === v);
          if (u) setCurrentUser(u);
        }}
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="切换用户" />
        </SelectTrigger>
        <SelectContent>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">
                    {getUserInitials(u)}
                  </AvatarFallback>
                </Avatar>
                <span>{u.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </header>
  );
}
