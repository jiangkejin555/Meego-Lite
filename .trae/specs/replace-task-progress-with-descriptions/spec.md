# 任务进度改为进度描述 Spec

## Why
当前「我的任务」里的“进度”主要以百分比呈现，但实际使用中该数值缺乏业务价值，反而增加了录入和维护成本。用户更关心任务过程中的阶段性记录，因此需要把“进度”收敛为纯文本的“进度描述”。

## What Changes
- 将「我的任务」列表中的“进度”列替换为“进度描述”，仅展示任务最新一条进度描述摘要，不展示状态标签。
- 任务详情页与编辑弹窗中的“完成进度”能力改为“进度描述 / 过程记录”，移除百分比、进度条、百分比快捷档与相关文案。
- `ProgressUpdate` 改为过程记录：每条记录保存描述内容、记录时刻的任务状态、作者与时间；原 `percent` 字段由 `status` 字段替代。
- 从数据模型中移除 `Task.progress` 与 `ProgressUpdate.percent`，并为 `ProgressUpdate` 增加 `status` 字段，避免任务系统继续维护失去业务意义的百分比字段。
- `GET /api/tasks`、`GET /api/tasks/[id]`、`GET/POST/PATCH/DELETE /api/progress` 的返回和校验逻辑改为围绕“进度描述”工作。
- 创建任务时自动写入第一条过程记录；每次任务状态发生变化时，系统自动追加一条带新状态的过程记录。
- AI 报告聚合与提示词文案不再引用“进度百分比”，改为“进度描述 / 过程记录”。
- 看板及其他任务视图中不再展示任务百分比，避免同一任务在不同界面出现不一致语义。
- **BREAKING**：现有任务进度相关交互从“百分比 + 描述”改为“状态 + 描述”；前端与接口中凡是依赖 `percent` 的逻辑都需同步替换为 `status`。

## Impact
- Affected specs: 任务列表展示、任务详情查看、任务编辑、进度记录接口、AI 报告聚合、看板任务卡片
- Affected code:
  - `src/components/tasks/task-list.tsx`
  - `src/components/tasks/task-detail.tsx`
  - `src/components/tasks/task-form.tsx`
  - `src/components/tasks/task-kanban.tsx`
  - `src/components/tasks/tasks-page.tsx`
  - `src/app/api/tasks/route.ts`
  - `src/app/api/tasks/[id]/route.ts`
  - `src/app/api/progress/route.ts`
  - `src/app/api/progress/[id]/route.ts`
  - `src/lib/report-aggregate.ts`
  - `src/lib/constants.ts`
  - `prisma/schema.prisma`
  - `src/lib/db-migrations.ts`
  - `src/app/api/seed/route.ts`

## ADDED Requirements

### Requirement: 我的任务展示最新进度描述
系统 SHALL 在「我的任务」列表中使用“进度描述”替换“进度”，并仅展示任务最新一条非空进度描述。

#### Scenario: 列表展示最新描述
- **WHEN** 用户进入「我的任务」列表
- **THEN** 表格列名显示为“进度描述”，单元格只展示该任务最新一条进度描述摘要，而不是百分比或状态标签

#### Scenario: 没有进度描述
- **WHEN** 任务尚未写入任何进度描述
- **THEN** 列表显示“暂无进度描述”占位，不显示 `0%` 等默认百分比

### Requirement: 进度记录为纯文本过程日志
系统 SHALL 将进度记录定义为“状态 + 描述”的过程日志，创建、编辑、删除围绕描述内容进行，且任务主表不再维护独立的百分比进度字段。

#### Scenario: 创建进度描述
- **WHEN** 用户在任务编辑页填写一段进度描述并提交
- **THEN** 系统创建一条 `ProgressUpdate` 记录，保存描述内容、当前任务状态、作者和时间

#### Scenario: 编辑进度描述
- **WHEN** 记录作者修改自己的进度描述并保存
- **THEN** 系统仅更新该条记录的描述内容，不涉及任何百分比计算或任务主表回写；该记录的状态快照保持为记录创建时的任务状态

#### Scenario: 空描述提交
- **WHEN** 用户提交空白描述
- **THEN** 系统拒绝写入并提示“请填写进度描述”

### Requirement: 任务创建和状态变更自动记录过程
系统 SHALL 在任务创建时自动写入首条过程记录，并在每次任务状态变化时自动追加一条带当前状态的过程记录。

#### Scenario: 创建任务自动记一条
- **WHEN** 用户创建新任务成功
- **THEN** 系统自动新增一条过程记录，内容为任务创建事件，状态为任务初始状态

#### Scenario: 更新任务状态自动记一条
- **WHEN** 用户将任务状态从一个值更新为另一个值
- **THEN** 系统自动新增一条过程记录，内容为本次状态变更事件，状态为更新后的任务状态

#### Scenario: 非状态字段更新
- **WHEN** 用户仅修改标题、描述、截止时间等非状态字段
- **THEN** 系统不自动新增状态变更记录

### Requirement: 详情与编辑页不再展示百分比
系统 SHALL 在任务详情页和编辑页仅展示进度描述时间线，不再展示百分比、进度条或百分比操作入口；每条记录的状态应以标签形式展示在原百分比位置。

#### Scenario: 查看详情页
- **WHEN** 用户打开任务详情
- **THEN** 页面展示按时间倒序排列的进度描述记录，并在原百分比位置以标签形式展示对应状态；页面移除“完成进度 60%”之类的概览区

#### Scenario: 编辑页写入记录
- **WHEN** 用户在任务编辑弹窗操作进度区
- **THEN** 页面仅提供文本输入、历史记录查看、作者本人编辑/删除能力，不提供百分比快捷按钮、数字输入框或相关提示文案；历史记录项在原百分比位置显示状态标签

### Requirement: 报告与周边视图统一采用描述语义
系统 SHALL 在报告聚合、任务卡片等周边视图中移除百分比语义，统一改为描述型表达或不展示该信息。

#### Scenario: 生成报告
- **WHEN** 系统聚合报告数据并构建提示词
- **THEN** 进度记录部分输出任务过程描述与状态变化，不再出现“进度 75%”“高进度项”等百分比表达

#### Scenario: 看板查看任务卡片
- **WHEN** 用户在看板中浏览任务卡片
- **THEN** 卡片不再展示百分比进度，避免与列表和详情页语义不一致

## MODIFIED Requirements

### Requirement: 任务进度记录接口
任务进度记录接口 SHALL 以“描述内容 + 状态快照”为记录语义；接口仍保留现有路径，但 `percent` 字段应从请求、响应与服务端逻辑中移除，改由服务端维护 `status`。

### Requirement: 任务列表接口返回最新进度信息
`GET /api/tasks` SHALL 返回任务最新一条进度描述摘要，用于列表与其他概览视图展示；客户端不再依赖 `progress` 或 `latestProgressPercent` 驱动“进度”列。

### Requirement: 任务模型不再包含 progress 字段
任务数据模型 SHALL 删除 `Task.progress` 字段，避免数据库与类型系统继续携带已经废弃的百分比语义。

#### Scenario: 读取任务
- **WHEN** 前端请求任务列表、任务详情或任务看板数据
- **THEN** 返回结果中不再包含 `progress` 字段

#### Scenario: 运行时建表与类型生成
- **WHEN** 系统执行运行时 schema 兼容逻辑或生成 Prisma Client
- **THEN** 任务模型不再包含 `progress` 字段，进度记录模型不再包含 `percent` 且新增 `status` 字段，数据库结构与类型定义保持一致

## REMOVED Requirements

### Requirement: 百分比驱动的任务进度
**Reason**: 百分比在当前任务管理场景中缺乏实际决策价值，且造成录入负担与多处展示不一致。
**Migration**: 在 `prisma/schema.prisma`、运行时建表逻辑和相关 API/前端类型中同步移除 `Task.progress` 与 `ProgressUpdate.percent`，并为 `ProgressUpdate` 新增 `status`。如 SQLite 运行时表结构需要兼容迁移，应在 `db-migrations.ts` 中补充安全迁移步骤，确保旧数据可平滑升级为“状态 + 描述”的过程记录模型。
