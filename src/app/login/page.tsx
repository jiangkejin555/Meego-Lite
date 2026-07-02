"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { useAppStore } from "@/store/app-store";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 60;

type LoginMode = "password" | "code";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "请求失败，请稍后再试");
  }
  return data;
}

/** Send-code button with cooldown countdown, shared by login & register. */
function SendCodeButton({
  email,
  purpose,
  disabled,
}: {
  email: string;
  purpose: "login" | "register";
  disabled?: boolean;
}) {
  const { toast } = useToast();
  const [seconds, setSeconds] = useState(0);
  const [sending, setSending] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const startCountdown = useCallback(() => {
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
  }, []);

  const handleSend = async () => {
    if (!EMAIL_REGEX.test(email)) {
      toast({ title: "请先填写正确的邮箱", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      await postJson("/api/auth/send-code", { email, purpose });
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

  const counting = seconds > 0;

  return (
    <Button
      type="button"
      variant="outline"
      className="shrink-0 whitespace-nowrap"
      disabled={disabled || sending || counting}
      onClick={handleSend}
    >
      {sending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : counting ? (
        `${seconds}s 后重试`
      ) : (
        "获取验证码"
      )}
    </Button>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="pr-10"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={show ? "隐藏密码" : "显示密码"}
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function LoginPage() {
  const { toast } = useToast();

  const [tab, setTab] = useState<"login" | "register">("login");

  // login state
  const [loginMode, setLoginMode] = useState<LoginMode>("password");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regCode, setRegCode] = useState("");
  const [registering, setRegistering] = useState(false);

  const setView = useAppStore((s) => s.setView);

  const goHome = () => {
    setView("home");
    // Hard navigation ensures middleware re-runs with the fresh session cookie
    // and avoids the RSC race where router.refresh() aborts router.replace().
    window.location.replace("/");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(loginEmail)) {
      toast({ title: "请填写正确的邮箱", variant: "destructive" });
      return;
    }
    if (loginMode === "password" && !loginPassword) {
      toast({ title: "请输入密码", variant: "destructive" });
      return;
    }
    if (loginMode === "code" && !/^\d{6}$/.test(loginCode.trim())) {
      toast({ title: "请输入 6 位验证码", variant: "destructive" });
      return;
    }
    setLoggingIn(true);
    try {
      await postJson("/api/auth/login", {
        email: loginEmail.trim(),
        mode: loginMode,
        password: loginPassword,
        code: loginCode.trim(),
      });
      toast({ title: "登录成功" });
      goHome();
    } catch (err) {
      toast({
        title: "登录失败",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      toast({ title: "请填写姓名", variant: "destructive" });
      return;
    }
    if (!EMAIL_REGEX.test(regEmail)) {
      toast({ title: "请填写正确的邮箱", variant: "destructive" });
      return;
    }
    if (regPassword.length < 6) {
      toast({ title: "密码长度至少 6 位", variant: "destructive" });
      return;
    }
    if (!/^\d{6}$/.test(regCode.trim())) {
      toast({ title: "请输入 6 位验证码", variant: "destructive" });
      return;
    }
    setRegistering(true);
    try {
      await postJson("/api/auth/register", {
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        code: regCode.trim(),
      });
      toast({ title: "注册成功", description: "已自动登录" });
      goHome();
    } catch (err) {
      toast({
        title: "注册失败",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo.svg"
            alt="Meego Lite"
            width={44}
            height={44}
            className="rounded-lg"
            priority
          />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Meego Lite</h1>
            <p className="text-sm text-muted-foreground">
              简版需求与任务协作系统
            </p>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">欢迎使用</CardTitle>
            <CardDescription>登录或创建账号以继续</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as "login" | "register")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">登录</TabsTrigger>
                <TabsTrigger value="register">注册</TabsTrigger>
              </TabsList>

              {/* 登录 */}
              <TabsContent value="login" className="mt-5">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email">邮箱</Label>
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>

                  <div className="inline-flex rounded-lg bg-muted p-[3px] text-sm">
                    {(
                      [
                        ["password", "密码登录"],
                        ["code", "验证码登录"],
                      ] as [LoginMode, string][]
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setLoginMode(mode)}
                        className={cn(
                          "rounded-md px-3 py-1 font-medium transition-colors",
                          loginMode === mode
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {loginMode === "password" ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="login-password">密码</Label>
                      <PasswordInput
                        id="login-password"
                        value={loginPassword}
                        onChange={setLoginPassword}
                        placeholder="请输入密码"
                        autoComplete="current-password"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="login-code">验证码</Label>
                      <div className="flex gap-2">
                        <Input
                          id="login-code"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="6 位验证码"
                          value={loginCode}
                          onChange={(e) =>
                            setLoginCode(
                              e.target.value.replace(/\D/g, "").slice(0, 6)
                            )
                          }
                        />
                        <SendCodeButton email={loginEmail} purpose="login" />
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loggingIn}
                  >
                    {loggingIn && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    登录
                  </Button>
                </form>
              </TabsContent>

              {/* 注册 */}
              <TabsContent value="register" className="mt-5">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-name">姓名</Label>
                    <Input
                      id="reg-name"
                      autoComplete="name"
                      placeholder="你的称呼"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-email">邮箱</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password">密码</Label>
                    <PasswordInput
                      id="reg-password"
                      value={regPassword}
                      onChange={setRegPassword}
                      placeholder="至少 6 位"
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-code">邮箱验证码</Label>
                    <div className="flex gap-2">
                      <Input
                        id="reg-code"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="6 位验证码"
                        value={regCode}
                        onChange={(e) =>
                          setRegCode(
                            e.target.value.replace(/\D/g, "").slice(0, 6)
                          )
                        }
                      />
                      <SendCodeButton email={regEmail} purpose="register" />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registering}
                  >
                    {registering && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    注册并登录
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Meego Lite · 通知支持飞书 / 企业微信 / 邮箱
        </p>
      </div>
    </div>
  );
}
