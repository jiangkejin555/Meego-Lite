# Tasks

- [x] Task 1: 数据层 —— User 新增 AI 配置字段
  - [x] SubTask 1.1: 在 `prisma/schema.prisma` 的 `User` 模型新增可空字段 `openaiApiKey`、`openaiBaseUrl`、`openaiModel`、`reportSummaryStyle`（均为 `String?`）
  - [x] SubTask 1.2: 在 `src/lib/db-migrations.ts` 的 `ensureUserSchema` 中追加对应 `ensureColumn` 调用（TEXT），保证既有 SQLite 库平滑补列
  - [x] SubTask 1.3: 执行 `prisma generate` 刷新 Prisma Client 类型

- [x] Task 2: 后端 —— 凭证来源改为用户配置
  - [x] SubTask 2.1: 重构 `src/lib/openai.ts`：`getOpenAIClient(config)` 与 `generateReportMarkdown(config, system, user)` 改为接收显式配置入参，不再读取 `process.env`；缺 apiKey 抛出明确错误；新增 `testOpenAIConnection(config)` 探活
  - [x] SubTask 2.2: 修改 `src/lib/report-aggregate.ts` 的 `buildReportPrompts`，新增可选 `summaryStyle` 入参，将其作为附加指令追加进提示词；系统提示词其余结构保持内置不变
  - [x] SubTask 2.3: 修改报告生成（`src/lib/report-generate.ts`）：从用户读取 AI 配置；未配置 `openaiApiKey` 且非 mock 时报告置 `failed` 并提示「尚未在「报告设置」中配置 AI API Key」；调用时传入用户的 apiKey/baseUrl/model 与 summaryStyle；保留 `REPORTS_MOCK` 分支
  - [x] SubTask 2.4: 新增 `src/app/api/reports/test-connection/route.ts`（POST）：`getSessionUser` 鉴权；入参 `{ openaiApiKey?, openaiBaseUrl?, openaiModel? }`，按「传入值优先，缺省/掩码回退当前用户已存配置」组合；Key 缺失返回 400；发起最小化探测调用（max_tokens:1、短超时）；成功返回 `{ ok: true }`，失败返回 `{ ok: false, error }`；不写库

- [x] Task 3: 后端 —— 设置读写接口
  - [x] SubTask 3.1: 修改 `src/app/api/users/[id]/route.ts`（PUT）：白名单新增 `openaiBaseUrl`/`openaiModel`/`reportSummaryStyle`；`openaiApiKey` 特殊处理（undefined 不变 / 掩码不变 / 空串清除 / 明文覆盖）；响应不返回明文 Key（掩码）
  - [x] SubTask 3.2: 修改 `src/app/api/auth/me/route.ts`：输出时移除 `openaiApiKey` 明文，新增掩码字段与 `openaiApiKeySet` 布尔标志
  - [x] SubTask 3.3: 抽取共享的 `maskApiKey(key)`/`isMaskedApiKey(key)` 工具（`src/lib/mask.ts`），供 me/users/test-connection 路由复用

- [x] Task 4: 前端 —— 个人设置新增「报告设置」卡片
  - [x] SubTask 4.1: 在 `src/components/settings/profile-settings.tsx` 扩展 `MeSettings` 接口（含 `openaiApiKey`/`openaiApiKeySet`/`openaiBaseUrl`/`openaiModel`/`reportSummaryStyle`）
  - [x] SubTask 4.2: 新增 `ReportSettingsCard` 展示卡片（标题「报告设置」，显示 Key 掩码/状态、Base URL、Model、总结方式摘要、「编辑」按钮），与现有卡片风格一致
  - [x] SubTask 4.3: 新增 `ReportSettingsForm` 编辑弹窗：Key（掩码显示 + 留空清除）、Base URL、Model、总结方式（多行 Textarea）；保存调用 `updateMe`，未改动 Key 时回传掩码原值
  - [x] SubTask 4.4: 在 `ReportSettingsForm` 底部操作区按「取消 → 测试连接 → 保存」排列，「测试连接」按钮调用 `POST /api/reports/test-connection`，loading/成功/失败均有内联反馈，不关闭弹窗
  - [x] SubTask 4.5: 在 `ProfileSettings` 渲染中加入「报告设置」卡片，并为其容器添加 `id`（`report-settings`）作为锚点

- [x] Task 5: 前端 —— 跨页面跳转与深链定位
  - [x] SubTask 5.1: 在 `src/store/app-store.ts` 新增 `profileSection: string | null` 与 `setProfileSection`（transient，不持久化）
  - [x] SubTask 5.2: 在 `src/components/reports/reports-page.tsx` 右上角新增「报告设置」按钮，点击执行 `setProfileSection("report-settings")` + `setView("profile")`
  - [x] SubTask 5.3: 在 `ProfileSettings` 中消费 `profileSection`：变更时滚动定位到「报告设置」卡片并做短暂高亮，随后清空 `profileSection`

- [x] Task 6: 验证与收尾
  - [x] SubTask 6.1: 运行 `tsc --noEmit` 与 `npm run lint`，修复类型与 ESLint 报错
  - [x] SubTask 6.2: 手动验证：保存/清除 Key 的掩码逻辑、Base URL/Model/总结方式持久化、测试按钮连通成功/失败/缺 Key 的反馈、未配置时生成报告的引导、从报告页按钮跳转并定位高亮、REPORTS_MOCK 预览
  - [x] SubTask 6.3: 更新 `checklist.md` 勾选

# Task Dependencies
- Task 2 / Task 3 依赖 Task 1（字段与类型到位）
- Task 4 依赖 Task 3（me 接口返回掩码字段、PUT 接受新字段）
- Task 5 可在 Task 4 之后进行（需要卡片锚点）
- Task 6 依赖前述全部任务
