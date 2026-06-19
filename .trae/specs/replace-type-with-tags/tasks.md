# Tasks

- [x] Task 1: 数据层与常量改造（移除 type、新增标签配色工具）
  - [x] SubTask 1.1: `prisma/schema.prisma` 移除 `Task.type` 字段及注释
  - [x] SubTask 1.2: 执行 `bun run db:push`（或 `prisma db push`）同步 SQLite 结构并 `db:generate`
  - [x] SubTask 1.3: `src/lib/constants.ts` 移除 `TaskType` / `TASK_TYPE_LABEL` / `TASK_TYPE_COLOR`
  - [x] SubTask 1.4: `src/lib/constants.ts` 新增标签配色：预设一组配色数组 + `tagColor(name: string)` 工具（按名称哈希稳定取色，超出则取模复用）

- [x] Task 2: 后端 API 改造
  - [x] SubTask 2.1: 新增 `src/app/api/tags/route.ts`，`GET` 返回库内所有任务标签去重、过滤空值、稳定排序后的 `{ tags: string[] }`
  - [x] SubTask 2.2: `src/app/api/tasks/route.ts` GET 移除 `type` 过滤，新增 `tag` 过滤（基于 JSON 字符串 `tags: { contains: '"<tag>"' }`）；POST 移除 `type` 写入
  - [x] SubTask 2.3: `src/app/api/tasks/[id]/route.ts` PUT 移除 `type` 写入
  - [x] SubTask 2.4: `src/app/api/stats/route.ts` 移除 requirement/task/bug 计数与返回中的 `type` 字段
  - [x] SubTask 2.5: `src/app/api/seed/route.ts` 移除各 demo 任务的 `type` 字段

- [x] Task 3: 状态管理与筛选栏
  - [x] SubTask 3.1: `src/store/app-store.ts` 的 `TaskFilter` 去掉 `type`，新增 `tag: string`（默认 "all"），同步 `defaultFilter`
  - [x] SubTask 3.2: `src/components/tasks/tasks-page.tsx` 将「类型」下拉框替换为「标签」下拉框，选项来自 `GET /api/tags`；`filterParams` 去 type 加 tag；重置条件判断同步更新

- [x] Task 4: 列表 / 看板 / 详情 UI 改造
  - [x] SubTask 4.1: `src/components/tasks/task-list.tsx` 将「类型」列替换为「标签」列，用 `tagColor` 渲染彩色徽章，超出展示「+N」；移除 TASK_TYPE 引用与表头列数同步（colSpan）
  - [x] SubTask 4.2: `src/components/tasks/task-kanban.tsx` 卡片移除类型徽章，改为渲染彩色标签（前若干个 + 「+N」）
  - [x] SubTask 4.3: `src/components/tasks/task-detail.tsx` 移除「任务类型」MetaRow，标签区改用 `tagColor` 彩色徽章

- [x] Task 5: 表单标签输入升级（复用 + 自定义）
  - [x] SubTask 5.1: `src/components/tasks/task-form.tsx` 移除「类型」Select 及 `type` 表单字段与 payload
  - [x] SubTask 5.2: 标签输入区增加已有标签候选（来自 `GET /api/tags`），点击加入且去重；保留自定义输入回车/按钮添加；已选标签用 `tagColor` 彩色展示

- [x] Task 6: Dashboard 改造
  - [x] SubTask 6.1: `src/components/dashboard/dashboard.tsx` 移除「类型分布」卡片、`typeOrder`、`Stats.type` 及 TASK_TYPE 引用；调整剩余卡片栅格布局

- [x] Task 7: 校验
  - [x] SubTask 7.1: 运行 `bun run lint` 与 TypeScript 类型检查，修复因移除 `type` 产生的所有引用错误
  - [x] SubTask 7.2: 启动 dev server，手测：新建/编辑任务的标签复用与自定义、列表标签列彩色展示、标签筛选、看板与详情展示、Dashboard 正常渲染

# Task Dependencies
- Task 2 依赖 Task 1（常量与配色工具、schema）
- Task 3 依赖 Task 2.1（标签接口）
- Task 4、Task 5 依赖 Task 1.4（tagColor）与 Task 2.1（标签接口）
- Task 6 依赖 Task 2.4（stats 去 type）
- Task 7 依赖 Task 1-6 全部完成
