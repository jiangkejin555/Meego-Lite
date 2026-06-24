"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  FileText,
  Bell,
  Settings,
  Menu,
  Plus,
  X,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserInitials } from "@/lib/users";
import { useToast } from "@/hooks/use-toast";
import type { ViewKey } from "@/store/app-store";

const NAV: { key: ViewKey; label: string; icon: React.ElementType }[] = [
  { key: "dashboard", label: "仪表盘", icon: LayoutDashboard },
  { key: "projects", label: "我的项目", icon: FolderKanban },
  { key: "tasks", label: "我的任务", icon: ListTodo },
  { key: "reports", label: "我的报告", icon: FileText },
  { key: "notifications", label: "通知中心", icon: Bell },
  { key: "profile", label: "个人设置", icon: Settings },
];

export function Header() {
  const currentUser = useAppStore((s) => s.currentUser);
  const setView = useAppStore((s) => s.setView);
  const openTaskForm = useAppStore((s) => s.openTaskForm);
  const view = useAppStore((s) => s.view);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const viewLabel = NAV.find((n) => n.key === view)?.label || "";

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
      toast({ title: "退出失败，请重试", variant: "destructive" });
    }
  };

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
            <SheetTitle 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                setView("home");
                setMobileOpen(false);
              }}
            >
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

      {currentUser && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px]">
                  {getUserInitials(currentUser)}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[120px] truncate text-sm">
                {currentUser.name}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{currentUser.name}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {currentUser.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setView("profile")}>
              <Settings className="mr-2 h-4 w-4" />
              个人设置
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={loggingOut}
              onSelect={(e) => {
                e.preventDefault();
                handleLogout();
              }}
              className="text-rose-600 focus:text-rose-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {loggingOut ? "退出中..." : "退出登录"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
