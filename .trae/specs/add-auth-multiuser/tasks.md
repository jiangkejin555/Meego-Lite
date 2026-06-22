# Tasks

- [ ] Task 1: 数据模型与依赖准备：为 User 增加密码哈希字段，新增验证码模型与项目创建者字段，安装鉴权依赖。
  - [ ] SubTask 1.1: 在 schema.prisma 的 User 增加 `passwordHash String?`；Project 增加 `creatorId String?` 及 `creator User?`（新增反向关系 `createdProjects`）。
  - [ ] SubTask 1.2: 新增 `VerificationCode` 模型（email、code、purpose: register|login、expiresAt、consumed、createdAt）。
  - [ ] SubTask 1.3: 安装 `jose`、`bcryptjs`、`@types/bcryptjs`；在 `.env`/`.env.example` 增加 `AUTH_SECRET`。
  - [ ] SubTask 1.4: 在 db-migrations.ts 增补 SQLite 运行时迁移：`User.passwordHash`、`Project.creatorId`、创建 `VerificationCode` 表（沿用现有 PRAGMA/ALTER 风格）；`prisma generate`。

- [ ] Task 2: 鉴权核心库：实现 JWT 签发/校验、密码哈希、会话 Cookie 读写、会话用户获取。
  - [ ] SubTask 2.1: 新增 `src/lib/auth.ts`：`signSession`/`verifySession`（jose，HS256，AUTH_SECRET）、`hashPassword`/`verifyPassword`（bcryptjs）、`SESSION_COOKIE` 常量。
  - [ ] SubTask 2.2: 新增 `getSessionUser(req)` 工具：从 Cookie 解析并返回当前用户，未认证返回 null；并提供统一 401 帮助函数。

- [ ] Task 3: 验证码与认证 API：实现发码、注册、登录、me、退出登录接口。
  - [ ] SubTask 3.1: `POST /api/auth/send-code`：生成 6 位码、10 分钟过期、60 秒冷却限频，复用 `sendEmail()` 发送。
  - [ ] SubTask 3.2: `POST /api/auth/register`：校验邮箱唯一、校验验证码、bcrypt 存密码、创建用户、签发 Cookie。
  - [ ] SubTask 3.3: `POST /api/auth/login`：支持 password 与 code 两种模式，成功签发 Cookie，失败返回统一提示。
  - [ ] SubTask 3.4: `GET /api/auth/me` 返回当前用户（去除 passwordHash）；`POST /api/auth/logout` 清除 Cookie。

- [ ] Task 4: 路由保护中间件：新增 `src/middleware.ts`，页面未登录跳 `/login`，API 未登录返回 401，放行 `/login` 与 auth 接口与静态资源。

- [ ] Task 5: 登录/注册页面：新增 `src/app/login/page.tsx`，含密码登录、验证码登录、注册三种表单与发码按钮（带倒计时）。
  - [ ] SubTask 5.1: 使用 **ui-ux-pro-max** skill 产出登录/注册页设计方案，确保与现有 shadcn/ui + Tailwind v4 风格、配色、排版一致。
  - [ ] SubTask 5.2: 基于现有 UI 组件实现页面，复用设计 token，避免引入与整体不符的样式。

- [ ] Task 6: 项目 API 隔离与授权改造（"项目负责人"→"用户授权"）。
  - [ ] SubTask 6.1: 列表 `GET /api/projects` 仅返回 `creatorId == me` 或 `owners 含 me` 的项目；创建时 `creatorId` 取会话用户。
  - [ ] SubTask 6.2: `GET/PUT /api/projects/[id]` 限可见者；`PUT` 限创建者或被授权者；`DELETE` 限创建者；owners 维护沿用 connect/set。

- [ ] Task 7: 任务 API 隔离与指派校验改造。
  - [ ] SubTask 7.1: `GET /api/tasks` 仅返回会话用户可见任务（本人创建 OR 所属项目可见）；移除信任前端 `mine`/`creatorId`。
  - [ ] SubTask 7.2: `POST /api/tasks` creatorId 取会话用户；校验 assignee 属于该项目授权范围（无项目仅可指派自己）。
  - [ ] SubTask 7.3: `GET/PUT/DELETE /api/tasks/[id]` 校验可见性与可编辑权限。

- [ ] Task 8: 评论/进度/通知/统计 API 身份改造。
  - [ ] SubTask 8.1: comments、progress 接口以会话用户为操作者并校验对所属任务可见。
  - [ ] SubTask 8.2: notifications 列表/标记仅作用于会话用户，移除 `?userId=` 信任。
  - [ ] SubTask 8.3: stats 改为按会话用户可见范围聚合。

- [ ] Task 9: 用户 API 收敛与注销（硬删除）。
  - [ ] SubTask 9.1: 下线 `POST /api/users`（注册替代）；`GET /api/users` 保留为活跃用户候选列表（name/email）。
  - [ ] SubTask 9.2: 新增账号自助操作：修改用户名、修改密码（校验原密码）。
  - [ ] SubTask 9.3: 注销 `DELETE /api/users/[id]`（仅本人）：若名下仍有自己创建的项目/任务则拒绝并提示；否则事务硬删除用户及个人关联数据（评论/进度/通知/授权关系），被指派任务 assignee 置空，清除 Cookie。

- [ ] Task 10: 前端登录态接入与清理。
  - [ ] SubTask 10.1: 移除 page.tsx 自动 seed 与自动选首位用户；`currentUser` 改由 `GET /api/auth/me` 获取；未登录交给 middleware 跳转。
  - [ ] SubTask 10.2: 移除 header.tsx 用户切换 `<Select>`，改为显示当前用户与"个人设置/退出"入口。
  - [ ] SubTask 10.3: 调整 app-store.ts：不再持久化可切换用户，与 me 接口对齐。

- [ ] Task 11: 导航合并为"个人设置"。
  - [ ] SubTask 11.1: 统一 NAV（sidebar 与 header 两处），移除"成员管理""通知设置"，新增"个人设置"项。
  - [ ] SubTask 11.2: 新增"个人设置"页面，整合退出登录、修改用户名、修改密码、通知设置（迁移自 notification-settings.tsx）、用户注销。
  - [ ] SubTask 11.3: 移除/废弃 user-management.tsx 引用。

- [ ] Task 12: 表单文案与候选范围调整。
  - [ ] SubTask 12.1: project-form.tsx 将"项目负责人"文案改为"用户授权"。
  - [ ] SubTask 12.2: task-form.tsx 负责人候选改为按所属项目授权用户过滤（无项目仅自己）。

- [ ] Task 13: 验证与回归：构建/lint 通过，手动验证注册→登录→建项目授权→隔离可见→指派限制→个人设置各功能→注销保护与硬删除全链路。

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3 依赖 Task 2
- Task 4 依赖 Task 2
- Task 5 依赖 Task 3
- Task 6、7、8、9 依赖 Task 2（身份推导基础）与 Task 1（字段）
- Task 10、11、12 依赖 Task 3、Task 6/7（接口就绪）
- Task 13 依赖以上全部
