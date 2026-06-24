# Tasks

- [x] Task 1: 数据层与基础依赖
  - [x] SubTask 1.1: 在 `prisma/schema.prisma` 新增 `Report` 模型（id/userId/type/title/startAt/endAt/content/meta/createdAt/updatedAt，含 `[userId, createdAt]` 索引、与 `User` 的级联关系）
  - [x] SubTask 1.2: 在 `src/lib/db-migrations.ts` 中追加 `ensureReportSchema`（建表 + `Report_userId_createdAt_index` 索引），并在 `ensureDatabaseSchema` 中调用，保证现有 SQLite 库平滑升级
  - [x] SubTask 1.3: 用 `bun add openai docx` 新增依赖（已有 `date-fns`，无需 dayjs）；执行 `bun run db:generate`

- [x] Task 2: 后端服务与 API
  - [x] SubTask 2.1: 新增 `src/lib/openai.ts`，封装 OpenAI 客户端（读取 `OPENAI_API_KEY`/`OPENAI_BASE_URL`/`OPENAI_MODEL`，`timeout: 60_000`、`maxRetries: 1`）；缺 key 时抛出明确错误
  - [x] SubTask 2.2: 新增 `src/lib/report-aggregate.ts`，实现「在 `[startAt, endAt]` 区间内聚合当前用户的任务（创建/更新）、进度记录、项目活动」并按方案 A 隔离（复用 `getVisibleProjectIds`）；输出结构化 JSON 与人类可读 summary
  - [x] SubTask 2.3: 新增 `src/app/api/reports/route.ts`：`GET` 列表（按 `createdAt desc`），`POST` 创建（手工 body）；全部 `getSessionUser` 鉴权 + `ensureDatabaseSchema`
  - [x] SubTask 2.4: 新增 `src/app/api/reports/[id]/route.ts`：`GET` 详情、`PATCH` 更新内容/标题、`DELETE` 删除（全部强制 `userId === 当前用户`，越权 404）
  - [x] SubTask 2.5: 新增 `src/app/api/reports/generate/route.ts`：`POST { type, startAt?, endAt? }` → 解析区间 → 聚合 → 调用 OpenAI → 写入 `Report` → 返回新记录；同区间重复生成始终**新建副本**；缺 key 返回 400，AI 失败返回 5xx 且不落库

- [x] Task 3: 前端导航与页面骨架
  - [x] SubTask 3.1: 在 `src/store/app-store.ts` 中将 `ViewKey` 增加 `"reports"`，并修正 `migrate` 中的合法值列表
  - [x] SubTask 3.2: 在 `src/components/layout/sidebar.tsx` 的 `NAV` 中「我的项目」之后插入「我的报告」（图标用 `lucide-react` 的 `FileText`）
  - [x] SubTask 3.3: 在 `src/app/page.tsx` 增加 `view === "reports"` 渲染分支，引入 `ReportsPage` 组件
  - [x] SubTask 3.4: 新增 `src/components/reports/reports-page.tsx`：两栏布局（左 ~300px 列表，右弹性详情），右上角生成按钮（用 `@/components/ui/button` + `@/components/ui/dropdown-menu`）

- [x] Task 4: 列表 / 详情 / 编辑 / 删除
  - [x] SubTask 4.1: 新增 `src/components/reports/reports-list.tsx`：用 `@tanstack/react-query` 拉 `/api/reports`；每项展示 类型 `Badge` / 标题 / 区间 / 创建时间（`toLocaleString("zh-CN")`）；当前选中高亮（`cn`）；用 `Skeleton`/空态 `Card`
  - [x] SubTask 4.2: 新增 `src/components/reports/report-detail.tsx`：右侧展示标题、区间、`createdAt/updatedAt`、用 `@/components/ui/markdown` 渲染内容
  - [x] SubTask 4.3: 在 `report-detail.tsx` 中实现「编辑/保存/取消」：点击编辑后用 `@/components/ui/textarea` 显示 Markdown，保存调用 `PATCH /api/reports/:id`，反馈用 `useToast`
  - [x] SubTask 4.4: 增加「删除」按钮（用 `@/components/ui/alert-dialog` 二次确认），调用 `DELETE /api/reports/:id` 后失效列表查询并切换选中

- [x] Task 5: 生成对话框
  - [x] SubTask 5.1: 新增 `src/components/reports/generate-report-dialog.tsx`：`@/components/ui/dialog` + `@/components/ui/radio-group`（今日/本周/自定义）+ 自定义时用 `@/components/ui/popover` + `@/components/ui/calendar`（range 模式）选区间
  - [x] SubTask 5.2: 提交时用 `date-fns` 计算区间（今日：`startOfDay`~now；本周：`startOfWeek({weekStartsOn:1})`~now）调用 `POST /api/reports/generate`
  - [x] SubTask 5.3: 处理加载/错误态：生成中禁用按钮并显示「生成中...」；失败时用 `useToast` 的 `variant: "destructive"` 显示后端 message
  - [x] SubTask 5.4: 成功后失效列表查询，自动选中新生成的报告

- [x] Task 6: 导出能力
  - [x] SubTask 6.1: 新增 `src/lib/report-export.ts`：`exportMarkdown(report)` 直接 Blob 下载 `.md`
  - [x] SubTask 6.2: 在同文件 `exportDocx(report)`：基于 `docx` 包将 Markdown 转换为 DOCX（最小可用：标题/段落/列表/加粗/链接），Blob 下载 `.docx`
  - [x] SubTask 6.3: 在 `report-detail.tsx` 增加「导出」`@/components/ui/dropdown-menu`（Markdown / Word）调用上述方法

- [x] Task 7: 验证与收尾
  - [x] SubTask 7.1: 运行 `bunx tsc --noEmit` 与 `bun run lint`，修复类型与 ESLint 报错
  - [x] SubTask 7.2: 手动验证主流程：导航、生成对话框三模式、自定义日历、加载态、未配置 OPENAI_API_KEY 错误提示、Markdown 渲染、编辑保存、删除二次确认、导出 MD/DOCX、空态（真实 AI 产出路径需真实 key 由使用方验证）
  - [x] SubTask 7.3: 更新 `checklist.md` 勾选

# Task Dependencies
- Task 2 依赖 Task 1（需要 Prisma schema 与依赖到位）
- Task 3 / Task 4 / Task 5 依赖 Task 2（API 已可用）
- Task 4 与 Task 5 可在 Task 3 之后并行
- Task 6 可在 Task 4 之后开始（需要 detail 组件挂载入口）
- Task 7 依赖前述全部任务完成
