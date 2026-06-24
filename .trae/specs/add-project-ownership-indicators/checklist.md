# Checklist

- [x] `GET /api/projects` 与 `GET /api/projects/[id]` 返回数据包含 `creatorId` 与 `creator { id, name, deletedAt }`
- [x] `PUT /api/projects/[id]` 在非创建者请求时返回 403，提示"只有项目创建者可以修改项目"
- [x] `ProjectItem` 类型已同步包含 `creatorId` 与 `creator` 字段
- [x] 项目卡片在创建者视角下显示 Badge"我创建的"
- [x] 项目卡片在被授权用户视角下显示 Badge"`<创建者姓名>` 授权"
- [x] 项目卡片对 `creatorId` 为空的历史数据显示 Badge"未知来源"，无报错
- [x] 项目卡片对非创建者隐藏编辑（Pencil）与删除（Trash2）按钮
- [x] 项目卡片对创建者保留编辑与删除按钮
- [x] 新建项目表单中"用户授权"下拉的候选列表不包含当前登录用户
- [x] 编辑项目表单中"用户授权"下拉的候选列表与已选 Badge 区都不包含当前登录用户
- [x] 创建/更新项目后，后端依旧将创建者隐式加入 owners（行为不回退）
- [x] `npx tsc --noEmit` 与 `npm run lint` 均通过
