# 项目归属标识与授权交互优化 Spec

## Why
当前项目列表对"我创建的"和"被他人授权的"项目没有视觉区分，被授权用户也能看到编辑/删除按钮（虽然后端会拦截删除，但 UI 仍误导用户）。同时项目授权下拉列表把"自己"也作为可选项暴露出来，与"创建者自动是 owner"的后端语义重复，使用体验冗余。

## What Changes
- 项目卡片新增 **归属标识 Badge**：标识"我创建的"或"`<授权人>` 授权"。
- 项目卡片在"被授权"场景下 **隐藏编辑/删除按钮**，并在 `PUT /api/projects/[id]` 上将编辑权限收敛为"仅创建者可改"。**BREAKING**（被授权用户原本可改项目本身的字段，现仅能改其下任务）。
- 项目授权下拉列表 **默认不展示当前用户**（创建者自身始终被后端隐式加入 owners，不再让用户重复勾选）。
- API/类型层暴露 `creatorId` 与 `creator`（含 `name`），供前端分支与文案展示使用。

## Impact
- Affected specs: 项目可见性与授权（add-auth-multiuser 中"项目可见性与授权"小节的 MODIFY）。
- Affected code:
  - 后端 API：[projects/route.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/app/api/projects/route.ts)、[projects/[id]/route.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/app/api/projects/[id]/route.ts)
  - 前端类型：[projects.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/lib/projects.ts)
  - 前端页面：[projects-page.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/projects/projects-page.tsx)
  - 项目表单：[project-form.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/projects/project-form.tsx)
- 不影响：任务可见性、任务在被授权项目下的修改权限（仍可改）、Schema。

## ADDED Requirements

### Requirement: 项目卡片归属标识
项目列表中的每张项目卡片 SHALL 显示一个归属 Badge，明确告知当前用户该项目是"我创建的"还是"由他人授权给我"。

#### Scenario: 当前用户为创建者
- **WHEN** 项目的 `creatorId === currentUser.id`
- **THEN** 卡片显示 Badge"我创建的"

#### Scenario: 当前用户为被授权用户
- **WHEN** 项目的 `creatorId !== currentUser.id` 且当前用户在 `owners` 列表中
- **THEN** 卡片显示 Badge"`<创建者姓名>` 授权"（创建者已注销时显示其原姓名 + "（已删除）"，遵循现有 `formatUserName` 规则）

#### Scenario: 历史无创建者数据
- **WHEN** 项目的 `creatorId` 为空（历史/迁移数据）
- **THEN** 卡片显示 Badge"未知来源"，不报错

### Requirement: 授权项目隐藏修改/删除入口
项目卡片 SHALL 仅对创建者展示"编辑项目"与"删除项目"按钮；被授权用户在卡片上看不到这两个按钮。

#### Scenario: 创建者视角
- **WHEN** 当前用户是项目创建者
- **THEN** 卡片右上角同时展示编辑（铅笔）与删除（垃圾桶）按钮

#### Scenario: 被授权者视角
- **WHEN** 当前用户仅为被授权用户
- **THEN** 卡片右上角不渲染编辑/删除按钮；该用户仍可点击"查看任务"进入任务页并修改任务

## MODIFIED Requirements

### Requirement: 项目编辑权限（收敛）
项目本身的字段编辑（name/description/status/priority/owners）SHALL 仅允许创建者执行；被授权用户对项目所拥有的能力收敛为"读取项目 + 修改其下任务"。

#### Scenario: 创建者修改项目
- **WHEN** 创建者发起 `PUT /api/projects/[id]`
- **THEN** 系统按请求更新项目字段

#### Scenario: 被授权用户尝试修改项目
- **WHEN** 非创建者发起 `PUT /api/projects/[id]`
- **THEN** 系统返回 403 并提示"只有项目创建者可以修改项目"

#### Scenario: 被授权用户修改任务
- **WHEN** 被授权用户修改该项目下的任务
- **THEN** 系统按现有任务权限规则允许操作（不受本次变更影响）

### Requirement: 项目授权下拉列表默认不含自己
项目表单中的"用户授权"多选下拉 SHALL 默认从候选列表中过滤掉当前登录用户，避免用户勾选"自己授权给自己"这一冗余项；后端在创建/更新时仍隐式将创建者加入 owners 以维持现有语义。

#### Scenario: 创建项目场景
- **WHEN** 用户打开"新建项目"表单并展开授权下拉
- **THEN** 候选用户列表不含当前用户

#### Scenario: 编辑项目场景
- **WHEN** 创建者打开自己已存在的项目并展开授权下拉
- **THEN** 候选列表不含当前用户；当前用户也不出现在已选中的 Badge 区
- **AND** 提交时即使 `ownerIds` 为空，后端仍保留创建者作为 owner（与现有逻辑一致）

### Requirement: 项目列表/详情 API 暴露创建者信息
`GET /api/projects` 与 `GET /api/projects/[id]` SHALL 在返回的项目对象中暴露 `creatorId` 与 `creator`（至少包含 `id, name, deletedAt`），以便前端展示归属标识。

#### Scenario: 列表响应
- **WHEN** 已登录用户请求项目列表
- **THEN** 每条返回数据包含 `creatorId`（可为 null）与 `creator`（可为 null，包含 `id, name, deletedAt`）

#### Scenario: 类型定义同步
- **WHEN** 前端导入 `ProjectItem` 类型
- **THEN** 类型中包含 `creatorId: string | null` 与 `creator: { id: string; name: string; deletedAt: Date | null } | null`
