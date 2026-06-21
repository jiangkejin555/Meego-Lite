"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageCircle,
  Mail,
  Bell,
  Webhook,
  Save,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserSettings {
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

async function fetchUsers() {
  const res = await fetch("/api/users");
  if (!res.ok) return [];
  const data = await res.json();
  return data.users as UserSettings[];
}

async function updateUser(id: string, payload: Partial<UserSettings>) {
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

function SettingsForm({
  initialUser,
  onClose,
}: {
  initialUser: UserSettings;
  onClose?: () => void;
}) {
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<UserSettings>(initialUser);

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<UserSettings>) =>
      updateUser(form.id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "设置已保存" });
      if (data.user) {
        setCurrentUser({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          avatar: data.user.avatar,
        });
      }
    },
    onError: (e: Error) => {
      toast({
        title: "保存失败",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />
          通知偏好 - {form.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
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
            （当前为演示模式，邮件内容记录在通知历史中，可接入
            SMTP/SendGrid/Resend 真实发送）
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

        <Separator />

        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            个人微信暂无公开机器人 API；企业微信个人通知需由管理员配置自建应用，并填写用户 ID。
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-1.5" />
            {updateMutation.isPending ? "保存中..." : "保存设置"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function NotificationSettings() {
  const currentUser = useAppStore((s) => s.currentUser);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  // Find the current user's settings; if found, render form with key=uid so
  // it re-initializes when the user switches.
  const me = users.find((u) => u.id === currentUser?.id);

  if (!me) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          请先在顶部选择当前用户
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <SettingsForm key={me.id} initialUser={me} />
    </div>
  );
}
