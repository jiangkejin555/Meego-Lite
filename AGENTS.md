# AGENTS.md

这个仓库面向长时运行的 coding agent 工作流。目标不是尽可能快地产出代码，而是让每一轮会话结束后，下一个会话仍然能无猜测地继续工作。

## 项目概述

Meego Lite 是一个轻量级项目/任务管理协作工具 —— 简版飞书 Meego。采用 Next.js 16 + React 19 + TypeScript 全栈架构，SQLite + Prisma ORM 持久化，支持本地开发、Docker 部署、Electron 桌面 App 打包、阿里云服务器部署四种方式。

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 16 (App Router) + React 19 + TypeScript |
| 样式 | Tailwind CSS 4 + shadcn/ui |
| 状态管理 | Zustand (客户端) + TanStack Query (服务端) |
| 数据库 | SQLite + Prisma ORM |
| 运行时 | Bun（推荐）或 Node.js 20+ |
| 桌面端 | Electron + electron-builder |
| 移动端 | Expo (React Native) |
| 部署 | Docker / PM2 + Nginx / Vercel |

### 关键目录

- `src/app/` — Next.js App Router 页面和 API 路由
- `src/components/` — React 组件（按功能分目录：tasks/ projects/ dashboard/ 等）
- `src/lib/` — 核心业务逻辑（auth、db、notifications、reports、db-migrations）
- `src/store/` — Zustand 全局状态
- `prisma/` — Prisma schema 和 SQLite 数据库文件
- `electron/` — Electron 主进程
- `mobile/` — Expo 移动端项目
- `scripts/` — 构建/停止/环境处理脚本
- `docs/` — 中文文档（部署、通知、SQLite 等）
- `Makefile` — 阿里云服务器一键部署

## 开工流程

写代码前先做这些事：

1. 用 `pwd` 确认当前目录。
2. 读取 `harness/claude-progress.md`，了解最新已验证状态和下一步。
3. 读取 `harness/feature_list.json`，选择优先级最高的未完成功能。
4. 用 `git log --oneline -5` 看最近提交。
5. 运行 `./harness/init.sh` 验证基础状态。
6. 在开始新功能前，先跑必需的 smoke test 或端到端验证（如 `bun run build` 或 `curl http://localhost:3000/api/health`）。

如果基础验证一开始就失败，先修基础状态，不要在坏的起点上继续叠新功能。

### 快速启动验证

```bash
# 开发模式
bun install
bun run db:generate
bun run db:push
bun run dev

# 生产构建验证
bun run build
bun run start

# 停止开发服务器
bun run dev:stop
```

## 工作规则

- 一次只做一个功能。
- 不要因为"代码已经写了"就把功能标记为完成。
- 除非为了消除当前 blocker 的窄范围修复，否则不要扩大到其他功能。
- 实现过程中不要悄悄改弱验证规则。
- 优先依赖仓库里的持久化文件，而不是聊天记录。
- 修改数据库 schema 后必须同步更新 `prisma/schema.prisma`，并考虑是否需要迁移脚本。
- 新增 API 路由放在 `src/app/api/` 下，遵循现有 RESTful 风格。
- 新增页面放在 `src/app/` 下，使用 Next.js App Router 约定。

## 数据库规范

- **Schema 文件**: `prisma/schema.prisma`
- **开发环境**: `bun run db:push` 同步表结构（会丢数据，谨慎）
- **生产环境**: `bun run db:migrate` 或 `make db-migrate`（安全迁移，自动备份）
- **生成 Client**: `bun run db:generate`
- **数据库文件**: `prisma/dev.db`（开发）/ `prisma/prod.db`（生产）
- 模型关系变更后需要重新生成 Prisma Client

## 构建与部署

### 本地开发
```bash
bun run dev        # 端口 3000
bun run dev:stop   # 停止开发服务器
```

### 生产构建
```bash
bun run build      # Next.js standalone + 复制 static/public
bun run start      # 生产服务器
```

### Docker
```bash
docker compose up -d --build
```

### Electron 桌面 App
```bash
bun run electron:dev       # 开发预览
bun run electron:build:mac # macOS 打包
bun run electron:build:win # Windows 打包
```

### 阿里云服务器（Makefile）
```bash
make first-deploy  # 首次部署（环境+依赖+构建+nginx+启动）
make update        # 日常更新（备份+拉代码+迁移+构建+重启）
make db-migrate    # 数据库迁移（自动备份）
make remote-deploy # 本地触发远程更新
```

## 必需文件

- `harness/feature_list.json`：功能状态的唯一事实来源
- `harness/claude-progress.md`：会话进度和当前已验证状态
- `harness/init.sh`：统一的启动与验证入口
- `harness/session-handoff.md`：较长会话可选的交接摘要

## 完成定义

一个功能只有在以下条件都满足时才算完成：

- 目标行为已经实现
- 要求的验证真的跑过（至少 `bun run build` 通过，功能相关页面/API 可访问）
- 证据记录在 `harness/feature_list.json` 或 `harness/claude-progress.md`
- 数据库变更已处理（schema 更新、迁移脚本、数据兼容性）
- 仓库仍然能按标准启动路径重新开始工作

## 收尾

结束会话前：

1. 更新 `harness/claude-progress.md`
2. 更新 `harness/feature_list.json`
3. 记录仍未解决的风险或 blocker
4. 在工作处于安全状态后，用清晰的提交信息提交
5. 保证下一轮会话可以直接运行 `./harness/init.sh`
