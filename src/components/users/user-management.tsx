"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Mail,
  MessageCircle,
  Plus,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserItem {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  feishuId?: string | null;
  wecomId?: string | null;
  notifyEmail: boolean;
  notifyFeishu: boolean;
  notifyWeCom: boolean;
  feishuWebhook?: string | null;
  wecomWebhook?: string | null;
  leadTimeMinutes: number;
  createdAt: string;
}

async function fetchUsers() {
  const res = await fetch("/api/users");
  if (!res.ok) return [];
  const data = await res.json();
  return data.users as UserItem[];
}

async function createUser(payload: Record<string, unknown>) {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "创建失败");
  }
  return res.json();
}

async function deleteUser(id: string) {
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("删除失败");
}

export function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const currentUser = useAppStore((s) => s.currentUser);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "用户创建成功" });
      setCreateOpen(false);
      setName("");
      setEmail("");
    },
    onError: (e: Error) => {
      toast({
        title: "创建失败",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "用户已删除" });
      setDeleteId(null);
    },
    onError: (e: Error) => {
      toast({
        title: "删除失败",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          共 {users.length} 个成员，用于任务的创建人/责任人选择
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" />
          新增成员
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="h-32 animate-pulse" />
              </Card>
            ))
          : users.map((u) => {
              const initials = u.name
                .split(/\s+/)
                .map((s) => s[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              const isCurrent = currentUser?.id === u.id;
              return (
                <Card
                  key={u.id}
                  className={isCurrent ? "border-primary" : ""}
                >
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {u.name}
                            </span>
                            {isCurrent && (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                当前
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" />
                            {u.email}
                          </p>
                        </div>
                      </div>
                      {u.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                          onClick={() => setDeleteId(u.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {u.notifyEmail && (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1"
                        >
                          <Mail className="h-2.5 w-2.5" />
                          邮箱
                        </Badge>
                      )}
                      {u.notifyFeishu && (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1"
                        >
                          <MessageCircle className="h-2.5 w-2.5" />
                          飞书
                        </Badge>
                      )}
                      {u.notifyWeCom && (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1"
                        >
                          <MessageCircle className="h-2.5 w-2.5" />
                          企微
                        </Badge>
                      )}
                      {!u.notifyEmail &&
                        !u.notifyFeishu &&
                        !u.notifyWeCom && (
                          <span className="text-[10px] text-muted-foreground">
                            未启用通知
                          </span>
                        )}
                    </div>
                    <div className="mt-2 text-[10px] text-muted-foreground">
                      提前 {u.leadTimeMinutes} 分钟提醒
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增成员</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="uname">
                姓名 <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="uname"
                placeholder="如：张三"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uemail">
                邮箱 <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="uemail"
                type="email"
                placeholder="zhangsan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              成员创建后默认启用邮件通知，可在「通知设置」中配置飞书/企微 webhook
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button
              disabled={!name.trim() || !email.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  name: name.trim(),
                  email: email.trim(),
                })
              }
            >
              {createMutation.isPending ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除该成员？</AlertDialogTitle>
            <AlertDialogDescription>
              该成员负责的任务需要重新指派，关联的评论和通知记录将保留。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
