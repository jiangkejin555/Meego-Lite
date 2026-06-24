# Checklist

## 数据与依赖
- [x] `prisma/schema.prisma` 中存在 `Report` 模型，字段、索引、级联关系符合 spec
- [x] `src/lib/db-migrations.ts` 包含 `Report` 表的轻量迁移逻辑
- [x] `prisma generate` 已执行，类型可用
- [x] `package.json` 含 `openai` 与 `docx` 依赖

## 后端 API
- [x] `GET /api/reports` 返回当前用户报告列表，按 `createdAt` 倒序
- [x] `POST /api/reports/generate` 支持 `type=daily|weekly|custom`，自定义需 `startAt/endAt`
- [x] 同区间重复生成会**新建副本**（不覆盖、不阻断）
- [x] `GET /api/reports/:id`、`PATCH /api/reports/:id`、`DELETE /api/reports/:id` 仅允许操作本人记录，否则返回 403/404
- [x] OpenAI 调用走官方 `openai` Node SDK 的 Chat Completions（非流式），仅在服务端发起
- [x] 调用使用 `process.env.OPENAI_MODEL || "gpt-4o-mini"`，并支持 `OPENAI_BASE_URL`
- [x] 缺失 `OPENAI_API_KEY` 时返回 400 并附带明确错误信息，且未发生任何外部请求
- [x] OpenAI 调用失败时返回 5xx，不在数据库中创建空报告
- [x] `OPENAI_API_KEY` 未出现在前端构建产物中
- [x] 数据聚合遵循方案 A 隔离规则（仅当前用户可见的任务/项目/进度）

## 前端导航
- [x] `ViewKey` 联合类型已包含 `"reports"`
- [x] 侧边栏在「我的项目」之后展示「我的报告」入口，点击可激活
- [x] `src/app/page.tsx` 在 `view === "reports"` 时渲染 `ReportsPage`

## 报告页面
- [x] 左侧报告列表展示类型 Badge / 标题 / 区间 / 创建时间，按时间倒序
- [x] 选中条目在列表内高亮
- [x] 右侧详情区以 Markdown 渲染内容，包含标题、区间、时间戳、操作按钮
- [x] 列表为空时显示空态提示

## 生成对话框
- [x] 生成对话框包含「今日 / 本周 / 自定义」三个选项
- [x] 选择「自定义」时显示 `RangePicker`，其他模式不显示
- [x] 生成中按钮禁用且有 loading 状态
- [x] 失败提示文案来自后端响应（含未配置 Key 的提示）
- [x] 成功后列表刷新并自动选中新生成报告

## 编辑 / 删除
- [x] 点击「编辑」切换到 textarea 显示 Markdown 原文
- [x] 「保存」调用 `PATCH /api/reports/:id` 并切回渲染态
- [x] 「取消」丢弃未保存内容
- [x] 「删除」带 `Popconfirm` 二次确认；删除后列表自动刷新与切换选中

## 导出
- [x] 「导出 → Markdown」下载有效 `.md` 文件
- [x] 「导出 → Word」下载有效 `.docx` 文件，标题/段落/列表/加粗/链接基本可读

## 鉴权与隔离
- [x] 用其他用户身份调用本人报告 ID 时，无法读取/修改/删除/导出
- [x] 生成时聚合的数据严格限定在当前用户可见范围

## 工程质量
- [x] `bunx tsc --noEmit` 通过
- [x] `bun run lint` 通过
- [x] 主流程手动验证通过（导航 / 生成对话框三模式 / 自定义日历 / 加载态 / 缺 Key 错误提示 / Markdown 渲染 / 编辑保存 / 删除二次确认 / 导出 MD·DOCX / 空态）
  - 注：真实 AI 生成路径（今日 / 本周 / 自定义实际产出内容）需配置真实 `OPENAI_API_KEY` 后由使用方验证，本地环境未配置 key
