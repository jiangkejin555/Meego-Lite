# 看板多维度分组切换 Spec

## Why
当前「任务页面 - 看板模式」只能按任务状态划分列。用户希望能够从多个维度审视任务流，需要支持按项目、负责人、优先级、标签等维度分组，并通过一个切换按钮在不同看板维度间快速切换。

## What Changes
- 在看板模式下新增「分组方式」切换控件（按钮 / 下拉），支持以下分组维度：
  - 状态（默认，沿用现有逻辑）
  - 项目
  - 负责人
  - 优先级
  - 标签
- 将 `TaskKanban` 组件由「写死按状态分组」重构为「按传入的 `groupBy` 维度动态生成列并分组」。
- 不同维度下的拖拽语义：
  - 状态 / 优先级 / 负责人 / 项目：支持拖拽卡片到目标列，调用现有 `PUT /api/tasks/[id]` 更新对应字段（`status` / `priority` / `assigneeId` / `projectId`）。
  - 标签：因任务可拥有多个标签，分组语义为「一个任务出现在它的每个标签列中」，该维度下**拖拽更新禁用**（只读浏览），避免多值歧义。
- 分组切换控件仅在看板模式下显示；切换到列表模式时隐藏。
- 分组维度为页面本地状态（不持久化到后端），与现有 `viewMode` 同级管理。

## Impact
- Affected specs: 任务看板视图（Task Kanban View）
- Affected code:
  - [tasks-page.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/tasks/tasks-page.tsx)：新增分组维度状态与切换控件，向 `TaskKanban` 传入 `groupBy`、`users`、`projects`。
  - [task-kanban.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/tasks/task-kanban.tsx)：重构为按 `groupBy` 动态生成列与分组、按维度路由拖拽更新字段。
  - [constants.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/lib/constants.ts)：（可选）新增看板分组维度的标签常量。

## ADDED Requirements

### Requirement: 看板分组维度切换
系统应在任务页面看板模式下提供分组方式切换控件，允许用户在「状态、项目、负责人、优先级、标签」之间切换看板的分组维度。

#### Scenario: 默认按状态分组
- **WHEN** 用户首次进入看板模式
- **THEN** 看板按任务状态分组，列顺序为 待开始 / 进行中 / 已暂停 / 已完成 / 已关闭（与现有行为一致）

#### Scenario: 切换到按项目分组
- **WHEN** 用户在看板模式下将分组方式切换为「项目」
- **THEN** 看板按任务所属项目生成列，无项目的任务归入「暂不关联」列
- **AND** 每列标题显示项目名称及该列任务数

#### Scenario: 切换到按负责人分组
- **WHEN** 用户在看板模式下将分组方式切换为「负责人」
- **THEN** 看板按任务责任人生成列，未分配责任人的任务归入「未分配」列

#### Scenario: 切换到按优先级分组
- **WHEN** 用户在看板模式下将分组方式切换为「优先级」
- **THEN** 看板生成 P0 / P1 / P2 / P3 四列并按任务优先级归类

#### Scenario: 切换到按标签分组
- **WHEN** 用户在看板模式下将分组方式切换为「标签」
- **THEN** 看板按已有标签生成列，一个含多个标签的任务在其每个标签列中各出现一次，无标签任务归入「无标签」列

#### Scenario: 切换控件仅在看板模式可见
- **WHEN** 用户处于列表模式
- **THEN** 分组方式切换控件不显示

### Requirement: 拖拽更新按分组维度路由
系统应根据当前分组维度，将卡片拖拽落点映射为对应字段更新。

#### Scenario: 按优先级拖拽更新
- **WHEN** 用户在「优先级」分组下将一张卡片从 P2 列拖到 P0 列
- **THEN** 调用 `PUT /api/tasks/[id]` 更新该任务 `priority` 为 `p0`，并刷新列表与统计，给出更新成功提示

#### Scenario: 按负责人拖拽更新
- **WHEN** 用户在「负责人」分组下将卡片拖到某负责人列（或「未分配」列）
- **THEN** 更新该任务 `assigneeId` 为对应用户 ID（或 `null`）

#### Scenario: 按项目拖拽更新
- **WHEN** 用户在「项目」分组下将卡片拖到某项目列（或「暂不关联」列）
- **THEN** 更新该任务 `projectId` 为对应项目 ID（或 `null`）

#### Scenario: 标签维度禁用拖拽更新
- **WHEN** 用户在「标签」分组下尝试拖拽卡片
- **THEN** 不发生字段更新（该维度为只读浏览）

## MODIFIED Requirements

### Requirement: 任务看板视图
系统应在任务页面提供看板视图，将任务以卡片形式按可选维度分列展示，并支持点击卡片打开详情。看板默认按状态分组；在状态、优先级、负责人、项目维度下支持拖拽卡片以更新任务对应字段；标签维度为只读多列展示。看板视图使用列表页相同的筛选结果作为数据源。
