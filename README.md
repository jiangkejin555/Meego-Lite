# Meego Lite

> 一个简版需求与任务协作工具 —— 个人/小团队也能轻松用上的"飞书 Meego 简化版"。

## 📖 项目简介

Meego Lite 是一个开箱即用的轻量级任务协作平台。它把"需求 / 任务 / Bug"三类工作项的管理、看板拖拽、评论协作、截止提醒、多渠道通知（站内 / 邮件 / 飞书 / 企业微信）整合在一起，让个人和小团队不再依赖重型 SaaS 也能高效协作。

项目同时支持**本地直接运行**、**Docker 部署**、**Electron 桌面 App 打包**、**云端（Vercel + Neon）部署**四种方式，可以从零成本起步、平滑扩展到团队多人协作。

### ✨ 功能特性

- 📋 **任务管理**：支持需求 / 任务 / Bug 三种类型，状态、优先级、截止时间、进度跟踪
- 🗂️ **看板视图**：拖拽式任务看板（基于 dnd-kit）
- 👥 **用户管理**：多用户协作，任务创建者 / 负责人分配
- 💬 **任务评论**：每个任务下可讨论交流
- 🔔 **多渠道通知**：站内通知 + 邮件 + 飞书 Webhook + 企业微信 Webhook
- ⏰ **截止时间提醒**：可配置提前多少分钟提醒
- 📊 **数据统计**：仪表盘展示任务概况
- 🌗 **明暗主题**：自动跟随系统或手动切换
- 📱 **响应式设计**：手机、平板、桌面端均可使用

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | [Next.js 16](https://nextjs.org/) (App Router) |
| UI 框架 | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| 样式 | [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| 数据库 | [SQLite](https://www.sqlite.org/) + [Prisma ORM](https://www.prisma.io/) |
| 状态管理 | [Zustand](https://github.com/pmndrs/zustand) |
| 表单 | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| 拖拽 | [dnd-kit](https://dndkit.com/) |
| 国际化 | [next-intl](https://next-intl.dev/) |
| 运行时 | [Bun](https://bun.sh/) |
| 桌面 | [Electron](https://www.electronjs.org/) |
| 容器 | [Docker](https://www.docker.com/) |

---

## 🚀 快速开始

### 前置要求

- macOS / Linux / Windows
- 已安装 [Bun](https://bun.sh/)（推荐）或 Node.js 20+

如果还没装 Bun，先执行：

```bash
curl -fsSL https://bun.sh/install | bash
# 安装完关闭并重新打开终端，验证：
bun --version
```

### 步骤 1：克隆项目

```bash
git clone git@github.com:jiangkejin555/Meego-Lite.git
cd Meego-Lite
```

### 步骤 2：配置环境变量（.env）

复制模板：

```bash
cp .env.example .env
```

然后按需填写以下内容：

```bash
# ===== 数据库 =====
# 默认本地 SQLite，无需修改；如需 PostgreSQL，改成对应连接串
DATABASE_URL="file:./dev.db"

# ===== NextAuth 鉴权（如启用登录） =====
NEXTAUTH_SECRET="用 openssl rand -base64 32 生成"
NEXTAUTH_URL="http://localhost:3000"

# ===== SMTP 邮件通知（可选，启用邮件渠道时必填） =====
# 以 QQ 邮箱为例：登录 QQ 邮箱 → 设置 → 账户 → 开启 IMAP/SMTP → 获取 16 位授权码
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_account@qq.com
SMTP_PASS=刚才那串16位授权码
SMTP_FROM="Meego Lite <your_account@qq.com>"
```

> ⚠️ **SMTP 注意事项**：
> - `SMTP_FROM` 中的邮箱必须等于 `SMTP_USER`，否则 QQ 邮箱会拒收（`mail from address must be same as authorization user`）。
> - 不要使用 `${SMTP_USER}` 这种变量插值写法，dotenv 默认不展开，请直接写完整地址。
> - 如果 465 端口被网络封禁，可改用 `SMTP_PORT=587` 并设置 `SMTP_SECURE=false`（STARTTLS 模式）。
> - 不需要邮件通知的话，整段 SMTP 配置可以省略，仅站内 / 飞书 / 企业微信 渠道仍可正常工作。
>
> 完整 SMTP / 飞书 / 企业微信 配置见 [通知配置指南](./docs/通知配置指南.md)。

### 步骤 3：安装依赖与初始化数据库

```bash
# 安装依赖
bun install

# 生成 Prisma Client
bun run db:generate

# 把表结构同步到数据库（首次会生成 prisma/dev.db）
bun run db:push
```

### 步骤 4：编译 / 运行

**开发模式（带热更新，推荐日常使用）**：

```bash
bun run dev
```

**生产模式（先编译再启动）**：

```bash
bun run build
bun run start
```

启动成功后，打开浏览器访问 **http://localhost:3000** 即可。

> ⚠️ 运行期间不要关闭该终端窗口，关闭终端会让应用停止。要停止应用，在终端按 `Control + C`。

---

## 🐳 Docker 部署

适合服务器部署或不想本地装 Bun 的场景。先[安装 Docker Desktop](https://www.docker.com/products/docker-desktop/)，然后一键启动：

```bash
docker compose up -d --build
```

访问 http://localhost:3000 即可。数据通过 Docker 命名卷 `meego-db` 持久化，重启容器不会丢失。

常用命令：

| 命令 | 作用 |
|------|------|
| `docker compose ps` | 查看运行状态 |
| `docker compose logs -f` | 查看日志 |
| `docker compose stop` / `start` | 暂停 / 重启 |
| `docker compose down` | 停止并清理容器（**数据保留** ✅） |
| `docker compose down -v` | 停止并 **删除数据卷**（⚠️ 数据会丢失） |

> 详细部署说明见 [部署与使用指南 - Docker](./docs/部署与使用指南.md#四方式-bdocker-运行适合服务器部署)。

---

## 🖥️ Electron 桌面 App

把 Meego Lite 打包成 macOS `.dmg` / Windows `.exe`，分发给同事或客户**双击即用，无需安装 Bun / Node**。底层通过 [Electron](https://www.electronjs.org/) 把 Chromium 内核 + Node.js 运行时 + Next.js standalone server 封装到一个可执行文件里。

### 安装 Electron 依赖（首次）

```bash
bun add -D electron electron-builder
```

> 项目已预置 `electron/main.js` 主进程文件以及 `package.json` 中的打包配置，可直接用。

### 本地预览

打包前先验证能否正常跑起来：

```bash
bun run electron:dev
```

该命令会自动 `next build` 生成 standalone 产物，并启动一个 Electron 窗口加载本地 Next.js 服务。

### 打包安装包

```bash
# macOS（在 Mac 电脑上执行）
bun run electron:build:mac

# Windows（在 Windows 电脑上执行）
bun run electron:build:win
```

产物位于 `dist-electron/` 目录：
- macOS：`Meego Lite-x.x.x-arm64.dmg`（Apple Silicon）/ `Meego Lite-x.x.x.dmg`（Intel）
- Windows：`Meego Lite Setup x.x.x.exe`

> ⚠️ **国内打包失败（GitHub 超时）**：打包前切换到国内镜像即可
> ```bash
> export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
> export ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
> bun run electron:build:mac
> ```
>
> ⚠️ **跨平台限制**：Mac 上不能打 Windows 包，反之亦然，建议用 GitHub Actions 同时跑两个平台任务。

### 数据存储位置（每台电脑独立的本地 SQLite）

| 系统 | 数据库路径 |
|------|----------|
| macOS | `~/Library/Application Support/Meego Lite/app.db` |
| Windows | `%APPDATA%\Meego Lite\app.db` |
| Linux | `~/.config/Meego Lite/app.db` |

> ⚠️ 桌面 App 是每台电脑独立的本地数据库，**多人使用时数据不互通**，需要协作请走 Docker / 云端部署。
>
> 详细打包流程、签名公证、Prisma 跨平台 binaryTargets 配置见 [部署与使用指南 - 桌面 App](./docs/部署与使用指南.md#五方式-c打包成桌面-appmacwindows-双平台分发)。

---

## 🧭 使用方式

启动成功后浏览器打开 http://localhost:3000，建议按以下顺序上手：

1. **初始化示例数据（可选）**：`curl -X POST http://localhost:3000/api/seed` 一键生成示例用户与任务，方便预览
2. **创建用户**：进入「用户」页签 → 「新建用户」，填写姓名、邮箱及通知偏好（邮件 / 飞书 / 企业微信 Webhook）
3. **管理任务**：在「任务」页签新建需求 / 任务 / Bug，支持**列表视图**筛选搜索、**看板视图**拖拽切换状态、**详情页**评论与进度跟踪
4. **接收通知**：右上角 🔔 查看站内通知；在「设置」中开启截止提醒；用户资料里填好的邮件 / 飞书 / 企微 渠道会同步推送
5. **查看仪表盘**：「仪表盘」页签可看任务总览、状态分布、近期截止任务等数据
6. **主题与多端**：右上角切换 明亮 / 暗黑 / 跟随系统；手机或平板浏览器访问 `http://你的IP:3000` 即可获得响应式体验

> 截止提醒由 `/api/notifications/check-deadlines` 触发，可通过 cron 定期调用。

---

## 📄 License

MIT
