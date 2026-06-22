# 任务进度更新（进度日志）Spec

## Why
当前任务「完成进度」只有一个百分比进度条与滑块，丢失了过程信息。实际工作中一个人任务会有详细的阶段性更新（如"今天发了 A/B/C 三个红人的影片，还剩 7 个"）。需要把单一数字升级为带文字描述的进度更新时间线，同时保留百分比用于列表/看板/仪表盘的概览与聚合。

## What Changes
- 新增 `ProgressUpdate` 数据模型：每条记录含文字描述（必填）+ 百分比（可选 0-100）+ 作者 + 时间。
- 任务「当前进度」由**最近一条带百分比的 ProgressUpdate** 驱动；`Task.progress` 字段保留并继续作为该值的缓存来源，供列表/看板/仪表盘显示。
- 新增后端接口：`GET/POST /api/progress`、`PATCH/DELETE /api/progress/[id]`（照搬现有 `/api/comments` 范式）。
- 运行时建表：在 `src/lib/db-migrations.ts` 增加 `ensureProgressSchema`（项目使用运行时自动建表，不走 prisma migrate）。
- 任务详情页（只读）：完成进度区改为「概览百分比 + 细进度条 + 最新一条进度常驻 + 折叠的历史进度时间线」。
- 编辑任务弹窗：**唯一写入口**。「完成进度」从两列网格中移出、单独整排；内容为「文字输入框 + 百分比快捷按钮(0/25/50/75/100 + 手填) + 可编辑/删除的历史记录」，独立即时保存（不依赖表单"保存"按钮）。
- 我的任务列表表格：进度列从末尾移到「状态」列之后；支持表格内快捷修改进度（下拉菜单快捷档 0/25/50/75/100 + 可快捷输入文字），每次修改生成一条 ProgressUpdate。
- 进度更新**不发送任何通知**。
- **BREAKING**（交互层面）：移除新建/编辑弹窗中的进度滑块（[task-form.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/tasks/task-form.tsx#L650-L665)）；详情页移除可编辑进度条，改为只读时间线。

## Impact
- 受影响能力：任务进度管理、任务详情查看、任务编辑、任务列表行内操作。
- 受影响代码：
  - [schema.prisma](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/prisma/schema.prisma)（新增 `ProgressUpdate` 模型 + Task/User 关系）
  - [db-migrations.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/lib/db-migrations.ts)（`ensureProgressSchema`）
  - 新增 `src/app/api/progress/route.ts`、`src/app/api/progress/[id]/route.ts`
  - [tasks/[id]/route.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/app/api/tasks/[id]/route.ts)（GET 携带 progressUpdates）
  - [task-detail.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/tasks/task-detail.tsx)（只读时间线）
  - [task-form.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/tasks/task-form.tsx)（进度更新区，整排）
  - [task-list.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/tasks/task-list.tsx)（列顺序 + 行内改进度）

## ADDED Requirements

### Requirement: 进度更新记录
系统 SHALL 允许在任务上创建带文字描述与可选百分比的进度更新记录，并按时间倒序保存为该任务的进度时间线。

#### Scenario: 创建带百分比的进度更新
- **WHEN** 用户在编辑弹窗的进度区填写文字描述并选择/输入一个百分比，点击「添加进度」
- **THEN** 系统创建一条 ProgressUpdate（含文字、百分比、作者、时间），并将该百分比同步为任务的当前进度（`Task.progress`）

#### Scenario: 只写文字不填百分比
- **WHEN** 用户填写文字描述但不选择百分比并提交
- **THEN** 系统创建一条仅含文字的 ProgressUpdate，任务当前进度保持不变

#### Scenario: 文字为空
- **WHEN** 用户未填写文字描述（仅选了百分比或全空）尝试提交
- **THEN** 系统拒绝创建并提示「请填写进度描述」

### Requirement: 进度记录的编辑与删除
系统 SHALL 允许进度记录的作者本人编辑或删除其进度记录。

#### Scenario: 作者编辑自己的记录
- **WHEN** 进度记录作者在编辑弹窗修改某条记录的文字或百分比并保存
- **THEN** 系统更新该记录；若被修改的是当前生效的进度来源，则重新计算任务当前进度

#### Scenario: 非作者尝试编辑/删除
- **WHEN** 非作者用户尝试编辑或删除他人记录
- **THEN** 系统返回 403 并拒绝操作

#### Scenario: 删除当前进度来源记录
- **WHEN** 用户删除当前生效的"最近带百分比记录"
- **THEN** 系统将任务当前进度回退为剩余记录中最近一条带百分比的值；若不存在则为 0

### Requirement: 详情页只读进度时间线
系统 SHALL 在任务详情页以只读方式展示进度：概览百分比 + 进度条 + 最新一条进度常驻 + 可折叠的历史进度时间线。

#### Scenario: 查看历史进度
- **WHEN** 用户在详情页点击「查看历史进度 (N)」
- **THEN** 展开按时间倒序排列的历史记录（文字 + 百分比标签 + 作者 + 时间），且详情页不提供任何编辑/删除/输入控件

#### Scenario: 暂无进度更新
- **WHEN** 任务没有任何进度记录
- **THEN** 详情页显示进度概览（0% 或 Task.progress）与「暂无进度更新」占位，不展示时间线

### Requirement: 表格内快捷修改进度
系统 SHALL 在「我的任务」列表表格中，将进度列置于状态列之后，并支持行内快捷修改进度。

#### Scenario: 行内快捷改进度
- **WHEN** 用户点击进度单元格，选择一个快捷档（0/25/50/75/100）或输入一段快捷文字后确认
- **THEN** 系统创建一条 ProgressUpdate（百分比 = 所选档位，文字 = 用户输入或默认"快速更新进度至 X%"），更新任务当前进度并刷新列表

## MODIFIED Requirements

### Requirement: 任务当前进度展示
任务列表、看板卡片、仪表盘 SHALL 继续以 `Task.progress` 百分比展示当前进度；该值的语义改为"最近一条带百分比的进度更新"，由后端在写入进度记录时同步维护。

## REMOVED Requirements

### Requirement: 弹窗进度滑块 / 详情页可编辑进度条
**Reason**: 进度改为由带文字描述的进度更新记录驱动，单一滑块无法承载过程信息；详情页定位为只读。
**Migration**: 移除新建/编辑弹窗的进度滑块与详情页可编辑进度条；进度的新增/编辑/删除统一收敛到编辑弹窗的「进度更新」区与列表行内快捷修改。现有 `Task.progress` 数值保留，作为历史无记录任务的初始概览值。
