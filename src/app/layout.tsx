import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/layout/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meego Lite · 简版需求与任务协作",
  description:
    "简版 Meego：需求/任务/缺陷的协作管理，支持飞书、企业微信、邮箱截止提醒",
  keywords: [
    "Meego",
    "任务管理",
    "需求管理",
    "项目管理",
    "飞书通知",
    "企业微信通知",
  ],
  authors: [{ name: "Z.ai Team" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
