"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Bell,
  Mail,
  MessageCircle,
  ExternalLink,
  Save,
  Pencil,
  KeyRound,
  LogOut,
  Trash2,
  ShieldAlert,
  Clock,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getUserInitials } from "@/lib/users";

interface MeSettings {
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
}

const NAME_MAX_LENGTH = 30;
const RESEND_SECONDS = 60;

async function fetchMe(): Promise<MeSettings | null> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) return null;
  const data = await res.json();
  return data.user as MeSettings;
}

async function sendResetPasswordCode(email: string) {
  const res = await fetch("/api/auth/send-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, purpose: "reset_password" }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "验证码发送失败");
  }
  return res.json();
}

async function updateMe(id: string, payload: Record<string, unknown>) {
  const res = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "保存失败");
  }
  return res.json();
}

async function deleteMe(id: string) {
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "注销失败");
  }
  return res.json();
}

export function ProfileSettings() {
  const { data: me, isLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: fetchMe,
  });

  const [accountOpen, setAccountOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  if (isLoading || !me) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {isLoading ? "加载中..." : "无法加载账号信息，请重新登录"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* 1. 个人信息 */}
      <AccountCard me={me} onEdit={() => setAccountOpen(true)} />

      {/* 2. 通知设置 */}
      <NotificationCard me={me} onEdit={() => setNotificationOpen(true)} />

      {/* 3. 账号设置 */}
      <AccountSettingsCard
        me={me}
        onChangePassword={() => setPasswordOpen(true)}
      />

      {/* Dialogs — inner forms are gated by `open` so they remount with fresh state each time. */}
      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent>
          {accountOpen && (
            <EditAccountForm me={me} onDone={() => setAccountOpen(false)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          {passwordOpen && (
            <PasswordForm me={me} onDone={() => setPasswordOpen(false)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={notificationOpen} onOpenChange={setNotificationOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          {notificationOpen && (
            <NotificationForm
              me={me}
              onDone={() => setNotificationOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatLeadTime(minutes: number) {
  if (minutes >= 1440) {
    const days = minutes / 1440;
    return `${Number.isInteger(days) ? days : days.toFixed(1)} 天`;
  }
  if (minutes >= 60) {
    const hours = minutes / 60;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} 小时`;
  }
  return `${minutes} 分钟`;
}

function ChannelRow({
  icon,
  label,
  enabled,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  detail?: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {enabled && detail ? (
            <p className="truncate text-xs text-muted-foreground">{detail}</p>
          ) : null}
        </div>
      </div>
      <Badge variant={enabled ? "default" : "secondary"} className="shrink-0">
        {enabled ? "已开启" : "未开启"}
      </Badge>
    </div>
  );
}

function NotificationCard({
  me,
  onEdit,
}: {
  me: MeSettings;
  onEdit: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />
          通知设置
        </CardTitle>
        <CardDescription>提醒时间与邮件 / 飞书 / 企业微信通知渠道</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1.5" />
            编辑
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-center justify-between gap-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm font-medium">提前提醒时间</p>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatLeadTime(me.leadTimeMinutes)}
          </span>
        </div>
        <Separator />
        <ChannelRow
          icon={<Mail className="h-4 w-4" />}
          label="邮件通知"
          enabled={me.notifyEmail}
          detail={me.email}
        />
        <ChannelRow
          icon={<MessageCircle className="h-4 w-4 text-violet-600" />}
          label="飞书机器人通知"
          enabled={me.notifyFeishu}
          detail={me.feishuWebhook ? "已配置 Webhook" : "未配置 Webhook"}
        />
        <ChannelRow
          icon={<MessageCircle className="h-4 w-4 text-emerald-600" />}
          label="企业微信通知"
          enabled={me.notifyWeCom}
          detail={me.wecomId ? `用户 ${me.wecomId}` : "未配置用户 ID"}
        />
      </CardContent>
    </Card>
  );
}

function AccountCard({ me, onEdit }: { me: MeSettings; onEdit: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
        <Avatar className="h-16 w-16 shrink-0">
          <AvatarFallback className="text-xl">
            {getUserInitials(me)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold truncate">{me.name}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={onEdit}
              aria-label="编辑账号信息"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{me.email}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function EditAccountForm({
  me,
  onDone,
}: {
  me: MeSettings;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const [name, setName] = useState(me.name);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => updateMe(me.id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile-me"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (data.user) {
        setCurrentUser({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          avatar: data.user.avatar,
        });
      }
      toast({ title: "账号信息已更新" });
      onDone();
    },
    onError: (e: Error) =>
      toast({ title: "保存失败", description: e.message, variant: "destructive" }),
  });

  const trimmed = name.trim();
  const tooLong = trimmed.length > NAME_MAX_LENGTH;
  const empty = trimmed.length === 0;
  const dirty = trimmed !== me.name;
  const error = empty
    ? "用户名不能为空"
    : tooLong
      ? `用户名最多 ${NAME_MAX_LENGTH} 个字符`
      : "";

  const handleSubmit = () => {
    if (error) return;
    if (!dirty) {
      onDone();
      return;
    }
    mutation.mutate({ name: trimmed });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>编辑账号信息</DialogTitle>
        <DialogDescription>修改你的显示名称，邮箱暂不支持修改。</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label htmlFor="edit-name">用户名</Label>
          <Input
            id="edit-name"
            value={name}
            autoFocus
            maxLength={NAME_MAX_LENGTH + 10}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            placeholder="你的显示名称"
            aria-invalid={!!error}
          />
          {error ? (
            <p className="text-xs text-rose-600">{error}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              将展示在任务、项目与通知中
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>邮箱</Label>
          <Input value={me.email} disabled />
          <p className="text-xs text-muted-foreground">邮箱用于登录，暂不支持修改</p>
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={onDone}
          disabled={mutation.isPending}
        >
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!!error || mutation.isPending}
        >
          <Save className="h-4 w-4 mr-1.5" />
          {mutation.isPending ? "保存中..." : "保存"}
        </Button>
      </DialogFooter>
    </>
  );
}

function PasswordForm({ me, onDone }: { me: MeSettings; onDone: () => void }) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [sending, setSending] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const startCountdown = () => {
    setSeconds(RESEND_SECONDS);
    timer.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    setSending(true);
    try {
      await sendResetPasswordCode(me.email);
      toast({ title: "验证码已发送", description: "请查收邮箱，10 分钟内有效" });
      startCountdown();
    } catch (e) {
      toast({
        title: "发送失败",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => updateMe(me.id, payload),
    onSuccess: () => {
      toast({ title: "密码已修改" });
      onDone();
    },
    onError: (e: Error) =>
      toast({ title: "修改失败", description: e.message, variant: "destructive" }),
  });

  const newTooShort = newPassword.length > 0 && newPassword.length < 6;
  const mismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const counting = seconds > 0;

  const handleSubmit = () => {
    if (!code.trim()) {
      toast({ title: "请输入邮箱验证码", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "新密码长度至少 6 位", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "两次输入的新密码不一致", variant: "destructive" });
      return;
    }
    mutation.mutate({ code: code.trim(), newPassword });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          修改密码
        </DialogTitle>
        <DialogDescription>
          通过邮箱验证码验证身份，修改成功后下次登录请使用新密码。
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label>验证邮箱</Label>
          <div className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{me.email}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reset-code">邮箱验证码</Label>
          <div className="flex gap-2">
            <Input
              id="reset-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6 位数字验证码"
              value={code}
              maxLength={6}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0 whitespace-nowrap"
              disabled={sending || counting}
              onClick={handleSendCode}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : counting ? (
                `${seconds}s 后重试`
              ) : (
                "获取验证码"
              )}
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-pwd">新密码</Label>
          <Input
            id="new-pwd"
            type="password"
            autoComplete="new-password"
            placeholder="至少 6 位"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            aria-invalid={newTooShort}
          />
          {newTooShort && (
            <p className="text-xs text-rose-600">新密码长度至少 6 位</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-pwd">确认新密码</Label>
          <Input
            id="confirm-pwd"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            aria-invalid={mismatch}
          />
          {mismatch && (
            <p className="text-xs text-rose-600">两次输入的新密码不一致</p>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={onDone}
          disabled={mutation.isPending}
        >
          取消
        </Button>
        <Button onClick={handleSubmit} disabled={mutation.isPending}>
          <Save className="h-4 w-4 mr-1.5" />
          {mutation.isPending ? "提交中..." : "更新密码"}
        </Button>
      </DialogFooter>
    </>
  );
}

function NotificationForm({
  me,
  onDone,
}: {
  me: MeSettings;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MeSettings>(me);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => updateMe(me.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-me"] });
      toast({ title: "通知设置已保存" });
      onDone();
    },
    onError: (e: Error) =>
      toast({ title: "保存失败", description: e.message, variant: "destructive" }),
  });

  const handleSave = () => {
    mutation.mutate({
      notifyEmail: form.notifyEmail,
      notifyFeishu: form.notifyFeishu,
      notifyWeCom: form.notifyWeCom,
      feishuWebhook: form.feishuWebhook,
      wecomWebhook: form.wecomWebhook,
      feishuId: form.feishuId,
      wecomId: form.wecomId,
      leadTimeMinutes: form.leadTimeMinutes,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          通知设置
        </DialogTitle>
        <DialogDescription>
          配置任务提醒时间与各通知渠道。
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-2">
        {/* Lead time */}
        <div className="space-y-2">
          <Label>提前提醒时间（分钟）</Label>
          <p className="text-xs text-muted-foreground">
            在任务截止前多少分钟开始发送提醒通知（建议 30 ~ 240 分钟）
          </p>
          <Select
            value={String(form.leadTimeMinutes)}
            onValueChange={(v) =>
              setForm({ ...form, leadTimeMinutes: Number(v) })
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 分钟</SelectItem>
              <SelectItem value="30">30 分钟</SelectItem>
              <SelectItem value="60">1 小时</SelectItem>
              <SelectItem value="120">2 小时</SelectItem>
              <SelectItem value="240">4 小时</SelectItem>
              <SelectItem value="1440">1 天</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Email */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label className="cursor-pointer">邮件通知</Label>
            </div>
            <Switch
              checked={form.notifyEmail}
              onCheckedChange={(v) => setForm({ ...form, notifyEmail: v })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            通知将发送到 <span className="font-medium">{form.email}</span>
          </p>
        </div>

        <Separator />

        {/* Feishu */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-violet-600" />
              <Label className="cursor-pointer">飞书机器人通知</Label>
            </div>
            <Switch
              checked={form.notifyFeishu}
              onCheckedChange={(v) => setForm({ ...form, notifyFeishu: v })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            在飞书群中添加「自定义机器人」，复制 webhook
            地址粘贴到下方。通知会以交互卡片形式推送到对应群。
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">飞书 Webhook URL</Label>
            <Input
              placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxxxx"
              value={form.feishuWebhook || ""}
              onChange={(e) =>
                setForm({ ...form, feishuWebhook: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">飞书用户 ID（可选，用于 @）</Label>
            <Input
              placeholder="ou_xxxxxxxxxxxxxxxx"
              value={form.feishuId || ""}
              onChange={(e) => setForm({ ...form, feishuId: e.target.value })}
            />
          </div>
          <a
            href="https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            如何获取飞书自定义机器人 webhook？
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <Separator />

        {/* WeCom */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              <Label className="cursor-pointer">企业微信通知</Label>
            </div>
            <Switch
              checked={form.notifyWeCom}
              onCheckedChange={(v) => setForm({ ...form, notifyWeCom: v })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            推荐使用企业微信自建应用向个人发送通知；如未配置应用消息，仍可兼容群机器人 webhook。
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">企业微信 Webhook URL（可选，群机器人兼容）</Label>
            <Input
              placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxx"
              value={form.wecomWebhook || ""}
              onChange={(e) =>
                setForm({ ...form, wecomWebhook: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">企业微信用户 ID（个人消息）</Label>
            <Input
              placeholder="例如 zhangsan"
              value={form.wecomId || ""}
              onChange={(e) => setForm({ ...form, wecomId: e.target.value })}
            />
          </div>
          <a
            href="https://developer.work.weixin.qq.com/document/path/91770"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            企业微信应用消息 / 群机器人配置文档
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={onDone}
          disabled={mutation.isPending}
        >
          取消
        </Button>
        <Button onClick={handleSave} disabled={mutation.isPending}>
          <Save className="h-4 w-4 mr-1.5" />
          {mutation.isPending ? "保存中..." : "保存通知设置"}
        </Button>
      </DialogFooter>
    </>
  );
}

function AccountSettingsCard({
  me,
  onChangePassword,
}: {
  me: MeSettings;
  onChangePassword: () => void;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
      toast({ title: "退出失败，请重试", variant: "destructive" });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: () => deleteMe(me.id),
    onSuccess: () => {
      setConfirmOpen(false);
      setCurrentUser(null);
      queryClient.clear();
      toast({ title: "账号已注销" });
      router.replace("/login");
      router.refresh();
    },
    onError: (e: Error) =>
      toast({ title: "注销失败", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          账号设置
        </CardTitle>
        <CardDescription>密码、登录状态与账号注销</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 修改密码 */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm font-medium">修改密码</p>
              <p className="text-xs text-muted-foreground">
                定期更换密码以保障账号安全
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={onChangePassword}>
            <Pencil className="h-4 w-4 mr-1.5" />
            修改
          </Button>
        </div>

        <Separator />

        {/* 退出登录 */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm font-medium">退出登录</p>
              <p className="text-xs text-muted-foreground">
                退出当前会话，返回登录页
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} disabled={loggingOut}>
            <LogOut className="h-4 w-4 mr-1.5" />
            {loggingOut ? "退出中..." : "退出登录"}
          </Button>
        </div>

        <Separator />

        {/* 注销账号 */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Trash2 className="h-4 w-4 shrink-0 text-rose-600" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-rose-600">注销账号</p>
              <p className="text-xs text-muted-foreground">
                永久删除账号，操作不可恢复
              </p>
            </div>
          </div>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1.5" />
            注销账号
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定注销账号？</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  注销后账号将被<strong>永久删除</strong>，无法恢复。你发表的评论、进度记录将一并删除，被指派给你的任务会解除负责人。
                </p>
                <p className="text-amber-600">
                  请先<strong>删除你创建的所有项目和任务</strong>，否则无法注销。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate();
              }}
            >
              {deleteMutation.isPending ? "注销中..." : "确认注销"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
