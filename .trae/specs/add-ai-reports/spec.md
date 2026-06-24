# 我的报告（AI 日报/周报）Spec

## Why
当前用户每天会创建/更新项目与任务、记录进度，但缺乏对一段时间内工作的自动化汇总能力。用户希望通过 AI 自动生成日报/周报，便于周期性回顾、向上同步、归档与导出。

## What Changes
- 在左侧导航栏「我的项目」之后新增「我的报告」入口（`view = "reports"`）。
- 新增「我的报告」页面：左侧历史报告列表 + 右侧报告详情（Markdown 渲染）。
- 右上角「生成报告」按钮，支持「今日 / 本周 / 自定义区间」三种模式。
- 生成时聚合时间区间内的数据（任务创建、任务更新、进度记录、项目活动），调用 OpenAI 生成 Markdown 报告。
- 报告支持：手工编辑 Markdown、删除、导出为 Markdown / Word(DOCX)。
- 同一区间重复生成 → **始终新建副本**（不覆盖、不提示）。
- 修改交互为**手工 Markdown 编辑**（不在编辑流中调用 AI 重写）。
- 导出格式仅在第一阶段支持 **Markdown** 与 **DOCX**（PDF 不在本次范围）。
- 新增 Prisma 模型 `Report`，新增 OpenAI 配置项（环境变量优先 + 个人设置可覆盖）。

## Impact
- 新增能力：AI 报告生成、报告管理（列表/查看/编辑/删除/导出）。
- 受影响的代码：
  - `prisma/schema.prisma`（新增 `Report` 模型）
  - `src/lib/db-migrations.ts`（新增 `Report` 表轻量迁移）
  - `src/store/app-store.ts`（`ViewKey` 增加 `"reports"`）
  - `src/components/layout/sidebar.tsx`（NAV 新增条目）
  - `src/app/page.tsx`（注册新 view 渲染）
  - 新增 `src/components/reports/*`（页面、列表、详情、生成对话框、导出工具）
  - 新增 `src/app/api/reports/*`（CRUD + 生成接口）
  - 新增 `src/lib/openai.ts`（OpenAI 客户端封装）
  - 新增 `src/lib/report-aggregate.ts`（区间内数据聚合）
  - 新增 `src/lib/report-export.ts`（Markdown/DOCX 导出工具）
  - `package.json`（新增依赖：`openai`, `docx`, `dayjs`/已有则复用）

## ADDED Requirements

### Requirement: 报告导航入口
系统 SHALL 在左侧导航栏「我的项目」下方提供「我的报告」入口，点击后切换至报告页面。

#### Scenario: 用户进入报告页面
- **WHEN** 用户点击侧边栏「我的报告」
- **THEN** 主区域渲染「我的报告」页面，显示当前用户的历史报告列表（按创建时间倒序）

### Requirement: 报告生成
系统 SHALL 提供「生成报告」入口，支持三种时间范围模式：今日、本周、自定义区间。

#### Scenario: 生成今日日报
- **WHEN** 用户点击「生成报告」并选择「今日」并提交
- **THEN** 系统聚合「当日 00:00 至当前时刻」的任务（按 `createdAt` 或 `updatedAt` 落入区间）、进度记录（`createdAt` 落入区间）、项目活动；调用 OpenAI 生成 Markdown 内容；将报告以 `type=daily` 入库；右侧立即定位到该新报告

#### Scenario: 生成本周周报
- **WHEN** 用户选择「本周」并提交
- **THEN** 系统按本地时区计算「本周一 00:00 ~ 当前时刻」并执行同样的聚合/生成/落库流程，`type=weekly`

#### Scenario: 生成自定义区间报告
- **WHEN** 用户选择「自定义」并使用 `RangePicker` 指定 `[startAt, endAt]` 提交
- **THEN** 系统按所选区间聚合并生成报告，`type=custom`

#### Scenario: 同区间重复生成
- **WHEN** 用户在已有相同区间报告时再次生成
- **THEN** 系统**始终新建一条副本**，不覆盖、不弹确认，列表展示多版本

#### Scenario: 区间内无任何活动
- **WHEN** 区间内没有任何任务/进度/项目活动
- **THEN** 系统仍生成报告，但 Markdown 内容明确说明「该时间段内未发现工作记录」

#### Scenario: OpenAI 调用失败
- **WHEN** OpenAI 接口返回错误或超时
- **THEN** 系统返回 5xx 错误，前端展示失败提示并保留对话框，不产生空报告

### Requirement: 报告列表与详情
系统 SHALL 在报告页面以「左列表 + 右详情」两栏布局展示报告。

#### Scenario: 列表项展示
- **WHEN** 列表加载完成
- **THEN** 每一项展示：类型 Badge（日报/周报/自定义）、标题、覆盖区间、创建时间；按 `createdAt` 倒序

#### Scenario: 切换详情
- **WHEN** 用户点击某条报告
- **THEN** 右侧加载并以 Markdown 渲染该报告内容，并显示标题、区间、创建/更新时间、操作按钮

### Requirement: 报告手工编辑
系统 SHALL 允许用户对报告 Markdown 内容进行手工编辑。

#### Scenario: 进入编辑
- **WHEN** 用户点击「编辑」
- **THEN** 报告详情区切换为 textarea（或简易 Markdown 编辑器）展示原始 Markdown，支持保存/取消

#### Scenario: 保存编辑
- **WHEN** 用户修改内容并点击「保存」
- **THEN** 系统通过 `PATCH /api/reports/:id` 更新内容与 `updatedAt`，详情区切回渲染态

#### Scenario: 取消编辑
- **WHEN** 用户点击「取消」
- **THEN** 编辑状态丢弃，详情区恢复为最近一次保存的渲染内容

### Requirement: 报告删除
系统 SHALL 支持删除单条报告，删除前需二次确认。

#### Scenario: 删除报告
- **WHEN** 用户在详情区点击「删除」并在 `Popconfirm` 中确认
- **THEN** 系统通过 `DELETE /api/reports/:id` 物理删除该记录，左侧列表移除该项，右侧选中第一条或显示空态

### Requirement: 报告导出
系统 SHALL 支持将单条报告导出为 Markdown 文件或 Word（DOCX）文件。

#### Scenario: 导出 Markdown
- **WHEN** 用户点击「导出 → Markdown」
- **THEN** 浏览器下载一个 `.md` 文件，内容为报告的 Markdown 原文

#### Scenario: 导出 DOCX
- **WHEN** 用户点击「导出 → Word」
- **THEN** 浏览器下载一个 `.docx` 文件，内容由 Markdown 转换得到（标题/段落/列表/加粗/链接等基本元素正确呈现）

### Requirement: 数据隔离与鉴权
系统 SHALL 在所有报告相关接口上沿用项目方案 A 的多用户隔离策略。

#### Scenario: 仅访问本人报告
- **WHEN** 任意用户调用报告查询、生成、修改、删除、导出接口
- **THEN** 系统只允许操作 `userId === 当前登录用户` 的记录；越权返回 404 或 403

#### Scenario: 生成时聚合数据范围
- **WHEN** 生成报告聚合数据
- **THEN** 仅纳入「该用户创建的任务」「分配给该用户的任务」「该用户拥有/创建的项目」「该用户产生的进度记录」，遵循现有任务可见性规则

### Requirement: OpenAI 调用形式
系统 SHALL 在**服务端**通过官方 `openai` Node SDK 调用 Chat Completions 接口（非流式），前端不直接发起对外请求，凭证只存在服务端环境变量中。

调用骨架：
```ts
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || undefined,
});
await client.chat.completions.create({
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  temperature: 0.3,
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user",   content: USER_PROMPT(aggregatedData) },
  ],
}); // SDK 默认超时 10min；本系统覆盖为 timeout: 60_000、maxRetries: 1
```

#### Scenario: 凭证仅在服务端读取
- **WHEN** 任意客户端组件（`"use client"`）尝试读取 `OPENAI_API_KEY`
- **THEN** 不被允许；所有 OpenAI 调用必须发生在 Route Handler / Server 文件中

#### Scenario: 非流式响应
- **WHEN** `/api/reports/generate` 调用 OpenAI
- **THEN** 使用一次性返回（非流式），将 `choices[0].message.content` 作为 Markdown 内容入库

### Requirement: OpenAI 环境变量
系统 SHALL 通过以下环境变量读取调用配置；除 `OPENAI_API_KEY` 外其余均为可选：

| 变量 | 是否必填 | 默认值 | 说明 |
|---|---|---|---|
| `OPENAI_API_KEY` | 必填 | — | OpenAI 或兼容服务的密钥（sk-xxx） |
| `OPENAI_BASE_URL` | 可选 | `https://api.openai.com/v1` | 代理/Azure/兼容端点（例如国内代理或 Openrouter） |
| `OPENAI_MODEL` | 可选 | `gpt-4o-mini` | 模型名称，需为 OpenAI Chat Completions 协议兼容模型 |

`.env` 示例：
```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# OPENAI_BASE_URL=https://your-proxy.example.com/v1
# OPENAI_MODEL=gpt-4o-mini
```

#### Scenario: 未配置 API Key
- **WHEN** 后端处理「生成报告」请求时检测到 `OPENAI_API_KEY` 缺失
- **THEN** 返回 400 错误并附带消息「未配置 OPENAI_API_KEY」，前端使用 `message.error` 显示，不发生任何外部网络请求

#### Scenario: 自定义 Base URL / 模型
- **WHEN** 用户在 `.env` 中提供 `OPENAI_BASE_URL` 或 `OPENAI_MODEL`
- **THEN** 调用使用提供的值；未提供时使用默认值

#### Scenario: 凭证不进前端 bundle
- **WHEN** 前端构建产物生成
- **THEN** `OPENAI_API_KEY` 不出现在任何客户端 JS 包中（仅在 Route Handler 内引用）

#### Scenario: 本期不在 UI 中配置
- **WHEN** 在「个人设置」等 UI 内
- **THEN** 不提供 OpenAI 配置入口；所有配置以环境变量为准（避免多用户互相覆盖；后续版本再考虑）

### Requirement: 数据模型
系统 SHALL 引入 `Report` 模型用于持久化报告。

#### Scenario: 模型字段
- **WHEN** 在 Prisma schema 中定义
- **THEN** 包含字段：`id`(cuid)、`userId`、`type`(daily|weekly|custom，字符串)、`title`、`startAt`、`endAt`、`content`(Markdown)、`meta`(JSON 字符串，冗余统计)、`createdAt`、`updatedAt`，并建立 `[userId, createdAt]` 索引；`User` 通过 onDelete: Cascade 关联

## MODIFIED Requirements

### Requirement: 全局视图 ViewKey
`ViewKey` 联合类型在原有基础上**新增** `"reports"` 选项；侧边栏 NAV 数组在「我的项目」之后新增对应条目；`src/app/page.tsx` 增加 `view === "reports"` 的渲染分支。其他视图行为不变。

## REMOVED Requirements
（无）
