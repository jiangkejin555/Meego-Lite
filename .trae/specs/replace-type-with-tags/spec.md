# 去除「类型」并升级「标签」 Spec

## Why
当前任务的「类型」（需求/任务/缺陷）三者实现完全同构，没有任何差异化字段、状态流或行为，仅是一个换色徽章，对用户无价值。改为以「标签」作为唯一的分类维度，标签支持复用与自定义，更贴合本项目「轻量任务协作」的定位。

## What Changes
- **BREAKING** 移除任务的 `type` 字段（需求/任务/缺陷）及其所有 UI、筛选、统计入口。
- 任务列表表格中原「类型」列替换为「标签」列，展示彩色标签徽章。
- 筛选栏中「类型」下拉框替换为「标签」下拉框，选项来自数据库中已有标签去重后的集合。
- 新增 `GET /api/tags` 接口：返回库内所有任务标签去重后的列表。
- 新建/编辑任务时，「标签」输入支持：从已有标签中选择 + 自定义输入新标签。
- 标签徽章按标签名稳定地映射到一组预设配色；标签数量超过配色数时颜色可重复。
- 看板卡片、任务详情抽屉移除「类型」徽章/字段；Dashboard 移除「类型分布」卡片。

## Impact
- Affected specs: 任务管理（创建/编辑/筛选/列表/看板/详情）、数据看板统计。
- Affected code:
  - `prisma/schema.prisma`（移除 `Task.type`）
  - `src/lib/constants.ts`（移除 TaskType 相关，新增标签配色工具）
  - `src/store/app-store.ts`（筛选状态去 type、加 tag）
  - `src/app/api/tasks/route.ts`、`src/app/api/tasks/[id]/route.ts`（去 type，加 tag 过滤）
  - `src/app/api/tags/route.ts`（**新增**）
  - `src/app/api/stats/route.ts`（去 type 统计）
  - `src/app/api/seed/route.ts`（去 type 字段）
  - `src/components/tasks/task-form.tsx`、`task-list.tsx`、`task-kanban.tsx`、`task-detail.tsx`、`tasks-page.tsx`
  - `src/components/dashboard/dashboard.tsx`

## ADDED Requirements

### Requirement: 标签数据查询接口
系统 SHALL 提供一个接口返回数据库中所有任务标签去重后的集合，供筛选与表单复用。

#### Scenario: 查询去重标签
- **WHEN** 客户端请求 `GET /api/tags`
- **THEN** 返回 `{ tags: string[] }`，其中标签已去除重复且按字母/拼音稳定排序，空标签被过滤

### Requirement: 标签彩色展示
系统 SHALL 为每个标签按其名称稳定地分配一种配色；当标签种类数超过预设配色数量时，颜色 MAY 重复。

#### Scenario: 同名标签同色
- **WHEN** 同一标签名出现在列表、看板、详情等多处
- **THEN** 该标签在各处渲染为同一种颜色

#### Scenario: 配色不足时复用
- **WHEN** 不同标签的数量超过预设配色数量
- **THEN** 超出部分的标签复用已有配色，且渲染不报错

### Requirement: 标签输入支持复用与自定义
新建/编辑任务时，标签输入 SHALL 同时支持选择已有标签和输入全新标签。

#### Scenario: 选择已有标签
- **WHEN** 用户在标签输入区展开候选列表
- **THEN** 列表展示来自 `GET /api/tags` 的已有标签，点击即加入当前任务标签集合，且不重复添加

#### Scenario: 自定义新标签
- **WHEN** 用户输入一个库中不存在的标签名并确认（回车或点击添加）
- **THEN** 该新标签被加入当前任务标签集合并随任务一并保存

### Requirement: 按标签筛选任务
任务列表 SHALL 支持按单个标签筛选。

#### Scenario: 选择标签筛选
- **WHEN** 用户在筛选栏标签下拉框选择某标签
- **THEN** 列表/看板仅展示包含该标签的任务

#### Scenario: 重置筛选
- **WHEN** 存在标签筛选条件且用户点击「重置」
- **THEN** 标签筛选恢复为「全部」，与其他筛选项一并清空

## MODIFIED Requirements

### Requirement: 任务列表展示
任务列表表格 SHALL 以「标签」列替代原「类型」列，标签以彩色徽章形式展示；当任务标签过多时仅展示前若干个并用「+N」提示其余数量。

### Requirement: 任务创建与更新
创建/更新任务的请求体 SHALL 不再包含 `type` 字段；`tags` 字段继续以字符串数组形式提交并以 JSON 字符串持久化。

## REMOVED Requirements

### Requirement: 任务类型（需求/任务/缺陷）
**Reason**: 三种类型实现完全同构、无差异化价值，徒增认知负担。
**Migration**: 移除 `Task.type` 列；历史数据的类型信息不再保留与展示（如需保留可由用户自行用标签标注）。Dashboard 的「类型分布」卡片一并移除。
