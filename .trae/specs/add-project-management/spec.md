# Add Project Management Spec

## Why
用户希望在任务管理系统（Meego-lite）中增加对项目维度的支持，以便能按项目对任务进行归类和管理。当前任务没有项目的概念，引入项目可以帮助更好地组织、筛选和跟踪相关的任务（需求/任务/缺陷）。

## What Changes
- 增加 `Project` 数据库模型（包含项目名称、项目负责人、项目描述、项目状态、优先级等字段，不包含起止时间以保持轻量）。
- 项目状态定义为四个阶段：未开始、进行中、已完成、已暂停。
- 在 `Task` 模型中增加 `projectId` 关联字段。
- 在左侧导航栏 (`sidebar.tsx`) 增加“项目”列表入口。
- 新增项目列表页面，支持查看项目列表。
- 支持创建和编辑项目：录入或修改名称、负责人、项目描述、状态、优先级。
- 在新建和编辑任务/需求/缺陷时，支持选择关联的项目。
- 在任务列表页 (`tasks-page.tsx`) 的筛选区，增加按项目进行筛选的功能。

## Impact
- Affected specs: 任务创建、任务筛选、全局导航
- Affected code:
  - `prisma/schema.prisma`
  - `src/components/layout/sidebar.tsx`
  - `src/components/tasks/task-form.tsx`
  - `src/components/tasks/tasks-page.tsx`
  - 新增 `src/components/projects/` 相关组件
  - 新增 API 路由 `src/app/api/projects/route.ts`

## ADDED Requirements
### Requirement: Project Management
系统应当支持项目的创建、查看和编辑，以及将任务关联至特定项目。

#### Scenario: Create/Edit a Project
- **WHEN** 用户在项目列表页点击“创建项目”或“编辑”，并填写有效信息（名称、负责人、项目描述、状态、优先级等）后提交
- **THEN** 系统成功保存项目信息，并在项目列表中展示更新后的项目状态（未开始/进行中/已完成/已暂停）。

#### Scenario: Assign Task to Project
- **WHEN** 用户新建或编辑任务时，在项目下拉框中选择一个项目并保存
- **THEN** 该任务成功与项目关联，并在任务列表中可通过该项目进行筛选。

#### Scenario: Default Project Option When Creating Task
- **WHEN** 用户打开新建任务表单
- **THEN** 项目下拉框列出所有项目，首项为“暂不关联”并默认选中；若用户保持“暂不关联”，则该任务不关联任何项目。

#### Scenario: Dashboard Shows Project Overview
- **WHEN** 用户进入仪表盘
- **THEN** 仪表盘展示项目相关的概览信息（如项目总数及各状态分布）。

#### Scenario: Jump From Project to Its Tasks
- **WHEN** 用户在项目列表中点击某个项目的“查看任务”入口
- **THEN** 系统跳转至任务列表页，并自动应用该项目的筛选条件，仅展示该项目下的任务。