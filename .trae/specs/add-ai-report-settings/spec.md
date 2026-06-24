# 报告设置 Spec

## Why
当前 AI 报告生成的凭证（API Key / Base URL / Model）只能通过 `.env` 环境变量配置，普通使用者无法在界面上配置，提示「未配置 OPENAI_API_KEY」却无处可填。需要让每位用户在「个人设置」中自助配置自己的 AI 凭证，并允许自定义总结方式（如按项目或按优先级总结）。同时在「我的报告」页面提供入口快速跳转到该设置。

## What Changes
- 在「个人设置」(`view = "profile"`) 中新增第四张卡片：**报告设置**，包含：
  - API Key（**掩码回显，不下发明文**；留空表示不修改）
  - Base URL（兼容端点，可选）
  - Model（模型名，可选，留空回退默认 `gpt-4o-mini`）
  - **总结方式**（用户自定义文本，例如「按项目分组总结」「按优先级总结」）
- 系统提示词（数据来源说明、输出格式约束）**保持内置、不可编辑、对用户不可见**；用户自定义的「总结方式」会被追加进生成请求。
- 新增**模型可用性测试接口**：编辑弹窗中在「保存」按钮**前面**提供「测试」按钮，使用当前表单中的配置（或回退已存配置）发起一次最小化探测调用，返回连通性结果。
- 报告生成凭证改为 **仅使用用户在 UI 中配置的值**（**BREAKING**：不再读取 `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` 环境变量作为生成凭证；`REPORTS_MOCK` 预览开关保留）。
- 配置直接存储在 **`User` 模型上的新增字段**（**不引入独立 settings 表**）：`openaiApiKey`、`openaiBaseUrl`、`openaiModel`、`reportSummaryStyle`。
- 在「我的报告」页面右上角新增「报告设置」按钮，点击跳转至「个人设置」并定位到「报告设置」卡片。
- 新增 `app-store` 字段 `profileSection`，用于跨页面深链定位到具体设置区块。

## Impact
- 受影响的能力：AI 报告生成（凭证来源变更）、个人设置（新增配置区块）、跨视图导航（新增 section 深链）。
- 受影响的代码：
  - `prisma/schema.prisma`（`User` 新增 4 个字段，不新增模型/表）
  - `src/lib/db-migrations.ts`（`ensureUserSchema` 追加列）
  - `src/lib/openai.ts`（`getOpenAIClient` / `generateReportMarkdown` 改为接收显式配置入参，不再读 env）
  - `src/lib/report-aggregate.ts`（`buildReportPrompts` 注入用户「总结方式」）
  - `src/app/api/reports/generate/route.ts`（改用当前用户的 AI 配置；缺失时返回 400 并引导去设置）
  - `src/app/api/reports/test-connection/route.ts`（**新增**：模型可用性测试接口）
  - `src/app/api/users/[id]/route.ts`（PUT 白名单新增 AI 字段；Key 留空不改、掩码返回）
  - `src/app/api/auth/me/route.ts`（输出掩码 Key 与 `openaiApiKeySet` 标志，不下发明文）
  - `src/components/settings/profile-settings.tsx`（新增「报告设置」卡片 + 编辑表单 + section 锚点）
  - `src/components/reports/reports-page.tsx`（右上角新增「报告设置」跳转按钮）
  - `src/store/app-store.ts`（新增 `profileSection` 与其 setter）

## ADDED Requirements

### Requirement: 报告设置卡片
系统 SHALL 在「个人设置」页面新增「报告设置」卡片，沿用现有「展示卡片 + 编辑弹窗」交互模式（与账号信息/通知设置一致）。

#### Scenario: 查看报告设置
- **WHEN** 用户进入「个人设置」页面
- **THEN** 展示一张「报告设置」卡片，显示当前 API Key 状态（已配置则展示掩码 `sk-***1234`，未配置则展示「未配置」）、Base URL、Model（未填则展示默认值占位）、总结方式摘要，并提供「编辑」按钮

#### Scenario: 编辑并保存报告设置
- **WHEN** 用户点击「编辑」，在弹窗中填写 API Key / Base URL / Model / 总结方式 并保存
- **THEN** 系统通过 `PUT /api/users/:id` 持久化配置，弹窗关闭，卡片刷新为最新状态，并以 toast 反馈成功

#### Scenario: API Key 掩码与留空保护
- **WHEN** 用户在已配置 Key 的情况下打开编辑弹窗
- **THEN** API Key 输入框默认不展示明文（占位提示「已配置，留空则不修改」）；保存时若该字段为空，则不更改已存的 Key；仅当用户输入了新值时才覆盖

#### Scenario: 清除 API Key
- **WHEN** 用户点击「清除密钥」并保存
- **THEN** 系统将该用户的 `openaiApiKey` 置空，卡片回到「未配置」状态

### Requirement: 模型可用性测试
系统 SHALL 提供模型可用性测试接口，供用户在保存前验证 API Key / Base URL / Model 是否可用。测试按钮在编辑弹窗中**位于「保存」按钮之前**。

#### Scenario: 测试按钮位置
- **WHEN** 用户打开「报告设置」编辑弹窗
- **THEN** 弹窗底部操作区按「取消 → 测试 → 保存」顺序排列，「测试」位于「保存」前面

#### Scenario: 测试连通成功
- **WHEN** 用户填写/沿用配置并点击「测试」
- **THEN** 前端调用 `POST /api/reports/test-connection`，后端使用「表单传入值优先，缺省回退当前用户已存配置」组合发起一次最小化探测调用（极小 token 预算）；连通成功时返回 200 与成功标志，前端以 toast 提示「连接成功」

#### Scenario: 测试失败
- **WHEN** Key 无效、Base URL 不可达、Model 不存在或调用超时
- **THEN** 后端返回非 2xx（或 `{ ok: false, message }`），前端以 destructive toast 展示后端错误信息，且不阻断用户继续编辑

#### Scenario: 测试时缺少 Key
- **WHEN** 表单 Key 为空且当前用户也未存有 Key
- **THEN** 后端返回 400「请先填写 API Key 再测试」，不发生任何外部请求

#### Scenario: 测试不持久化
- **WHEN** 用户仅点击「测试」而未点击「保存」
- **THEN** 表单中的配置不写入数据库（测试仅做临时探测）

### Requirement: AI 配置持久化与隔离
系统 SHALL 将 AI 配置作为字段保存在 `User` 模型上（不使用独立 settings 表），并严格按当前登录用户隔离读写。

#### Scenario: 字段定义
- **WHEN** 在 Prisma schema 中定义
- **THEN** `User` 新增可空字段：`openaiApiKey`(String?)、`openaiBaseUrl`(String?)、`openaiModel`(String?)、`reportSummaryStyle`(String?)；并通过 `src/lib/db-migrations.ts` 的 `ensureColumn` 在既有 SQLite 库上平滑补列；不引入新的模型或数据表

#### Scenario: 仅本人可读写
- **WHEN** 任意用户调用 `PUT /api/users/:id` 修改 AI 配置
- **THEN** 仅允许 `id === 当前登录用户` 时执行，否则返回 403

#### Scenario: 明文 Key 不下发前端
- **WHEN** 前端通过 `GET /api/auth/me` 获取用户信息
- **THEN** 响应中不包含 `openaiApiKey` 明文，仅包含掩码字符串（如 `sk-***1234`）与布尔标志 `openaiApiKeySet`

### Requirement: 生成报告使用用户配置
系统 SHALL 在生成报告时仅使用当前用户在 UI 中配置的 AI 凭证，不再以环境变量作为生成凭证。

#### Scenario: 使用用户凭证
- **WHEN** 用户触发生成报告
- **THEN** 系统使用该用户的 `openaiApiKey` / `openaiBaseUrl` / `openaiModel`（Model 留空时回退默认 `gpt-4o-mini`）调用 OpenAI Chat Completions

#### Scenario: 未配置 Key
- **WHEN** 当前用户未配置 `openaiApiKey` 且未开启 `REPORTS_MOCK`
- **THEN** 后端返回 400，消息明确提示「请先在个人设置中配置报告设置（API Key）」，前端以 toast 展示且不发生任何外部请求

#### Scenario: Mock 预览保留
- **WHEN** `.env` 中 `REPORTS_MOCK=1`
- **THEN** 跳过真实 AI 调用，返回 mock 报告，便于 UI 预览（与用户是否配置 Key 无关）

### Requirement: 自定义总结方式
系统 SHALL 允许用户自定义「总结方式」，并在生成时将其追加进提示词；系统提示词保持内置、不可编辑、对用户不可见。

#### Scenario: 注入总结方式
- **WHEN** 用户配置了 `reportSummaryStyle`（如「按项目分组并突出风险项」）
- **THEN** `buildReportPrompts` 将该偏好作为附加指令追加进发送给模型的提示中，影响输出的组织方式

#### Scenario: 未配置总结方式
- **WHEN** 用户未填写 `reportSummaryStyle`
- **THEN** 生成流程使用内置系统提示词的默认结构，不追加额外偏好

### Requirement: 从报告页快速跳转设置
系统 SHALL 在「我的报告」页面右上角提供入口，跳转到「个人设置」并定位至「报告设置」卡片。

#### Scenario: 跳转并定位
- **WHEN** 用户点击「我的报告」右上角的「报告设置」按钮
- **THEN** 视图切换为 `profile`，并滚动定位/高亮到「报告设置」卡片

## MODIFIED Requirements

### Requirement: OpenAI 环境变量（来自 add-ai-reports）
生成报告的 AI 凭证来源由「环境变量优先」**变更为「仅使用用户在个人设置中配置的值」**。`OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` 环境变量**不再用于报告生成**；`REPORTS_MOCK` 预览开关保留。`src/lib/openai.ts` 的 `getOpenAIClient` 与 `generateReportMarkdown` 改为接收显式配置入参（apiKey / baseURL / model），不再从 `process.env` 读取凭证。

### Requirement: 用户资料更新接口（PUT /api/users/:id）
在既有可更新字段白名单基础上**新增** `openaiBaseUrl`、`openaiModel`、`reportSummaryStyle` 直接更新；`openaiApiKey` 采用特殊处理：`undefined` 不变、非空字符串覆盖、空串清除。响应对象中以掩码形式返回 Key 状态，不返回明文。

## REMOVED Requirements
（无）
