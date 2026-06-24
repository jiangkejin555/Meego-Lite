# 登录鉴权与多用户隔离 Spec

## Why
项目即将部署到阿里云供多人使用，但当前**完全没有鉴权**：当前用户只是 localStorage 里选的一个 user，所有 API 直接信任前端传来的 `userId`/`creatorId`，可随意伪造，且所有人能看到所有项目和任务。需要引入真实登录、按用户隔离数据，并支持通过"项目授权"进行多人协作。

## What Changes
- 新增**登录 / 注册**能力：注册需设置密码并通过邮箱验证码；登录支持"邮箱验证码"和"密码"两种方式。
- 新增**自建会话机制**：JWT 签发后写入 httpOnly Cookie，新增 `middleware.ts` 保护所有页面与 API。
- **数据隔离**：每个用户只能看到"自己创建的"或"被授权的"项目，以及这些项目下的任务（含本人创建的无项目任务）。
- 将"项目负责人"语义改为"**用户授权**"：被授权用户可看到该项目下所有任务并可修改。**BREAKING**（字段语义变化，UI 文案变化）。
- 任务负责人(assignee)候选范围收敛为"**该项目已授权用户**"；无项目任务只能指派给自己。
- **改造全部现有 API**：身份一律从会话推导，不再接受前端传入的身份参数，并按可见性 / 授权做过滤与校验。**BREAKING**（API 入参与可见性行为变化）。
- 移除"成员管理"和"通知设置"两个独立页面，合并为单一"**个人设置**"页面：包含退出登录、修改密码、用户注销（硬删除）、修改用户名、通知设置。**BREAKING**（导航结构变化）。
- 移除首页自动 seed、自动选第一个用户、以及 Header 的用户切换器。
- **登录 / 注册页面 UI** 须与项目整体设计风格（shadcn/ui + Radix + Tailwind v4 + lucide-react）保持一致；实现阶段须使用 **ui-ux-pro-max** skill 产出设计方案后再落地。

## Impact
- Affected specs: 认证与会话、项目管理、任务管理、用户/成员管理、通知、统计仪表盘。
- Affected code（关键文件）：
  - 数据：[schema.prisma](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/prisma/schema.prisma)、[db-migrations.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/lib/db-migrations.ts)
  - 鉴权（新增）：`src/middleware.ts`、`src/lib/auth.ts`、`src/app/api/auth/**`、`src/app/login/page.tsx`
  - API 改造：[projects/route.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/app/api/projects/route.ts)、[projects/[id]/route.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/app/api/projects/[id]/route.ts)、[tasks/route.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/app/api/tasks/route.ts)、[tasks/[id]/route.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/app/api/tasks/[id]/route.ts)、[comments](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/app/api/comments/route.ts)、[progress](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/app/api/progress/route.ts)、[notifications](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/app/api/notifications/route.ts)、[stats/route.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/app/api/stats/route.ts)、[users/route.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/app/api/users/route.ts)、[users/[id]/route.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/app/api/users/[id]/route.ts)
  - 前端：[page.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/app/page.tsx)、[sidebar.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/layout/sidebar.tsx)、[header.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/layout/header.tsx)、[app-store.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/store/app-store.ts)、[project-form.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/projects/project-form.tsx)、[task-form.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/tasks/task-form.tsx)、`src/components/settings/**`、`src/components/users/user-management.tsx`（移除）
- 新增依赖：`jose`（middleware/edge 可用的 JWT 签验）、`bcryptjs` + `@types/bcryptjs`（密码哈希）；环境变量新增 `AUTH_SECRET`。
- 已有可复用能力：[notification.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/lib/notification.ts) 的 `sendEmail()`（QQ SMTP 已跑通）用于发送验证码。
- 已知影响：Electron 桌面端将同样需要登录（本期不为其单独豁免，作为已知项记录）。

## ADDED Requirements

### Requirement: 用户注册
系统 SHALL 允许新用户通过"用户名 + 邮箱 + 密码 + 邮箱验证码"完成注册，验证通过后创建账号并自动登录。

#### Scenario: 注册成功
- **WHEN** 用户填写合法用户名、未被占用的邮箱、密码，并请求发送验证码后输入正确且未过期的验证码提交
- **THEN** 系统创建用户（密码以 bcrypt 哈希存储）、消费该验证码、签发会话 Cookie，并进入应用主界面

#### Scenario: 邮箱已被占用
- **WHEN** 用户使用一个已存在（未注销）的邮箱注册
- **THEN** 系统拒绝并提示"邮箱已被注册"

#### Scenario: 验证码错误或过期
- **WHEN** 用户提交的验证码不匹配、已过期或已被消费
- **THEN** 系统拒绝注册并提示验证码无效，且不创建账号

### Requirement: 邮箱验证码发送
系统 SHALL 提供发送邮箱验证码的接口，用于注册与验证码登录，并对发送频率做限制以防滥用。

#### Scenario: 正常发送
- **WHEN** 用户请求向某邮箱发送验证码且距离上次发送已超过冷却时间
- **THEN** 系统生成 6 位数字验证码（设置过期时间，如 10 分钟），存储并通过邮件发送，返回成功

#### Scenario: 频率限制
- **WHEN** 用户在冷却时间内（如 60 秒）重复请求发送验证码
- **THEN** 系统拒绝并提示"请求过于频繁，请稍后再试"

### Requirement: 用户登录
系统 SHALL 支持"邮箱 + 密码"与"邮箱 + 验证码"两种登录方式，成功后签发会话 Cookie。

#### Scenario: 密码登录成功
- **WHEN** 用户输入邮箱与正确密码
- **THEN** 系统校验通过并签发 httpOnly 会话 Cookie

#### Scenario: 验证码登录成功
- **WHEN** 用户输入邮箱并提交正确且有效的验证码
- **THEN** 系统校验通过并签发会话 Cookie

#### Scenario: 凭据无效
- **WHEN** 密码错误或验证码无效
- **THEN** 系统拒绝登录并返回统一的失败提示（不泄露账号是否存在）

### Requirement: 会话与路由保护
系统 SHALL 通过 httpOnly Cookie 中的 JWT 维持会话，并通过 middleware 拦截未认证访问。

#### Scenario: 未登录访问受保护资源
- **WHEN** 未携带有效会话的请求访问任意页面或受保护 API
- **THEN** 页面请求重定向到 `/login`；API 请求返回 401

#### Scenario: 已登录获取当前用户
- **WHEN** 已登录用户请求 `GET /api/auth/me`
- **THEN** 系统返回当前用户信息（不含密码哈希）

#### Scenario: 退出登录
- **WHEN** 用户触发退出登录
- **THEN** 系统清除会话 Cookie，后续请求被视为未认证

### Requirement: 服务端身份推导
所有受保护 API SHALL 从会话推导操作者身份，不再信任前端传入的 `userId`/`creatorId`/`mine` 等身份参数。

#### Scenario: 创建任务时归属推导
- **WHEN** 已登录用户创建任务
- **THEN** `creatorId` 取自会话用户，忽略请求体中任何 creatorId

#### Scenario: 拉取本人数据
- **WHEN** 已登录用户请求任务/通知/统计
- **THEN** 数据范围依据会话用户计算，前端传入的身份参数无效

### Requirement: 个人设置页面

#### Scenario: 修改用户名
- **WHEN** 用户在个人设置中提交新用户名
- **THEN** 系统更新当前用户的 name

#### Scenario: 修改密码
- **WHEN** 用户提交正确的原密码与新密码
- **THEN** 系统更新密码哈希；原密码错误则拒绝

#### Scenario: 用户注销（硬删除）
- **WHEN** 用户请求注销账号且其名下仍有"自己创建的项目或任务"
- **THEN** 系统拒绝并提示"请先删除你创建的项目和任务后再注销"
- **WHEN** 用户名下已无自己创建的项目和任务并确认注销
- **THEN** 系统硬删除该用户及其个人关联数据（评论、进度更新、通知、项目授权关系；被指派任务的 assignee 置空），并清除会话

### Requirement: 登录/注册页面视觉一致性
登录与注册页面 SHALL 与项目整体设计语言（shadcn/ui + Radix + Tailwind v4 + lucide-react、现有配色与排版）保持一致，并在实现阶段使用 ui-ux-pro-max skill 指导设计。

#### Scenario: 风格一致
- **WHEN** 用户访问登录/注册页面
- **THEN** 页面复用现有 UI 组件与设计 token，视觉风格与应用内其他页面一致，不引入与整体不符的样式

## MODIFIED Requirements

### Requirement: 项目可见性与授权（原"项目负责人"）
项目 SHALL 记录创建者，并以"用户授权"替代原"项目负责人"概念。被授权用户可查看该项目下所有任务并可修改。

#### Scenario: 项目可见性
- **WHEN** 用户请求项目列表
- **THEN** 仅返回"该用户创建的"或"该用户在授权名单内的"项目

#### Scenario: 授权用户编辑
- **WHEN** 被授权用户编辑该项目或其下任务
- **THEN** 系统允许操作

#### Scenario: 删除项目
- **WHEN** 非创建者尝试删除项目
- **THEN** 系统拒绝（仅创建者可删除项目）

### Requirement: 任务可见性与指派范围
任务 SHALL 仅对"创建者"或"可见其所属项目的用户"可见；指派对象限定为该项目的已授权用户。

#### Scenario: 任务可见性
- **WHEN** 用户请求任务列表/详情
- **THEN** 仅返回其创建的、或其可见项目下的任务

#### Scenario: 指派范围限制
- **WHEN** 用户为某项目下任务选择负责人
- **THEN** 候选人仅包含该项目创建者与已授权用户；无项目任务只能指派给自己

### Requirement: 仪表盘统计范围
统计 SHALL 基于当前用户的可见数据计算，而非全库聚合。

#### Scenario: 个人可见统计
- **WHEN** 已登录用户访问仪表盘
- **THEN** 各项任务/项目计数与列表仅统计该用户可见的数据

## REMOVED Requirements

### Requirement: 独立"成员管理"页面与管理员建/删用户
**Reason**: 用户创建改由注册流程承担，账号移除改由用户自助注销承担；多用户场景下不应允许任意管理员凭空建/删他人账号。
**Migration**: 移除"成员管理"导航与页面；`POST /api/users`、`DELETE /api/users/[id]`（软删除）下线。项目授权/任务指派所需的用户候选列表，仍由 `GET /api/users`（返回活跃用户的 name/email）提供。

### Requirement: 独立"通知设置"页面
**Reason**: 合并进"个人设置"。
**Migration**: 原通知渠道开关/Webhook/提前提醒时长等表单内容迁入"个人设置"页面对应区块，仍作用于当前会话用户。

### Requirement: 前端用户切换器与自动 seed/自动选首位用户
**Reason**: 与真实登录冲突，存在越权风险。
**Migration**: 移除 Header 用户切换 `<Select>`；移除 [page.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/app/page.tsx) 的自动 seed 与自动选第一个用户逻辑；`currentUser` 改为从 `GET /api/auth/me` 获取。
