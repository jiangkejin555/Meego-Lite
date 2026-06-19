# Tasks
- [ ] Task 1: Update Database Schema
  - [ ] SubTask 1.1: 在 `prisma/schema.prisma` 中新增 `Project` 模型，包含 `name`, `ownerId`, `description`, `status` (未开始, 进行中, 已完成, 已暂停), `priority`, `createdAt`, `updatedAt` 字段。
  - [ ] SubTask 1.2: 在 `Task` 模型中增加 `projectId` (可选) 并建立与 `Project` 的关联。
  - [ ] SubTask 1.3: 运行 Prisma DB Push 并生成客户端代码。

- [ ] Task 2: Implement Project API & Store
  - [ ] SubTask 2.1: 创建 `src/app/api/projects/route.ts` 实现获取列表、创建和更新项目的接口。
  - [ ] SubTask 2.2: 使用 React Query 封装项目数据的请求与状态管理。

- [ ] Task 3: Build Project UI Components
  - [ ] SubTask 3.1: 在左侧导航栏 `sidebar.tsx` 增加“我的项目”导航项，并将现有“任务列表”入口改名为“我的任务”。
  - [ ] SubTask 3.2: 创建 `src/app/projects/page.tsx` 展示项目列表，并在列表中提供“编辑”操作入口。
  - [ ] SubTask 3.3: 创建 `src/components/projects/project-form.tsx`，支持新建和编辑模式，可填写/修改项目名称、负责人、项目描述、状态（未开始/进行中/已完成/已暂停）、优先级。

- [ ] Task 4: Integrate Project with Tasks
  - [ ] SubTask 4.1: 修改 `task-form.tsx`，新增“项目”下拉框，列出所有项目，首项为“暂不关联”并默认选中。
  - [ ] SubTask 4.2: 确保创建和更新任务的 API 能够正确处理 `projectId` 字段（“暂不关联”时为空）。
  - [ ] SubTask 4.3: 修改 `tasks-page.tsx` 的筛选组件，增加“按项目筛选”的功能，并实现筛选逻辑（支持通过 URL 查询参数预置项目筛选）。

- [ ] Task 5: Dashboard & Cross-Navigation
  - [ ] SubTask 5.1: 在仪表盘新增项目概览信息（如项目总数及各状态分布统计）。
  - [ ] SubTask 5.2: 在项目列表中为每个项目提供“查看任务”入口，点击后跳转至任务列表页并自动按该项目筛选。