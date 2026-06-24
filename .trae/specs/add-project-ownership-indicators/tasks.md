# Tasks

- [x] Task 1: 后端 API 暴露创建者信息并收敛编辑权限
  - [x] SubTask 1.1: 修改 `src/app/api/projects/route.ts` 的 GET 列表响应，在 `include` 中显式加入 `creator: { select: { id, name, deletedAt } }`，确保 `creatorId` 与 `creator` 出现在响应中
  - [x] SubTask 1.2: 修改 `src/app/api/projects/[id]/route.ts` GET 详情响应，同步加入 `creator` 关联
  - [x] SubTask 1.3: 修改 `src/app/api/projects/[id]/route.ts` PUT 鉴权：将"创建者 OR owner 可改"改为"仅 creatorId === me.id 才允许"，否则返回 403 "只有项目创建者可以修改项目"

- [x] Task 2: 前端 ProjectItem 类型同步
  - [x] SubTask 2.1: 在 `src/lib/projects.ts` 的 `ProjectItem` 中加入 `creatorId: string | null` 与 `creator: { id: string; name: string; deletedAt: string | Date | null } | null`

- [x] Task 3: 项目卡片新增归属 Badge 并按权限隐藏编辑/删除
  - [x] SubTask 3.1: 在 `src/components/projects/projects-page.tsx` 中读取 `useAppStore((s) => s.currentUser)`
  - [x] SubTask 3.2: 在状态/优先级 Badge 行旁渲染新的"归属" Badge：`creatorId === currentUser?.id` 显示"我创建的"；否则显示 "`<formatUserName(creator)>` 授权"；`creatorId == null` 显示"未知来源"
  - [x] SubTask 3.3: 仅当 `currentUser?.id === p.creatorId` 时渲染编辑（Pencil）和删除（Trash2）按钮，否则隐藏整组按钮

- [x] Task 4: 项目授权下拉默认排除当前用户
  - [x] SubTask 4.1: 在 `src/components/projects/project-form.tsx` 引入 `currentUser`
  - [x] SubTask 4.2: 在渲染候选列表的 `users.map(...)` 处过滤掉 `u.id === currentUser?.id`
  - [x] SubTask 4.3: 在已选中 Badge 渲染处也过滤掉 `currentUser`，并在初始化 `ownerIds` 时去除当前用户，确保 UI/数据一致

- [x] Task 5: 自验
  - [x] SubTask 5.1: 运行 `npx tsc --noEmit` 与 `npm run lint` 确保类型与 lint 通过
  - [x] SubTask 5.2: 浏览器手动验证：作为创建者看到 Badge"我创建的"+ 编辑/删除按钮；切换到被授权用户看到 Badge"xxx 授权"+ 无编辑/删除按钮；新建/编辑项目时下拉不含自己

# Task Dependencies
- Task 2 depends on Task 1（前端类型需对齐后端返回字段）
- Task 3 depends on Task 1、Task 2
- Task 5 depends on Task 1、Task 2、Task 3、Task 4
