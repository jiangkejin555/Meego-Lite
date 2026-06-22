# Tasks

- [x] Task 1: 定义看板分组维度常量与类型：在 [constants.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/lib/constants.ts) 中新增 `KanbanGroupBy` 类型（`"status" | "project" | "assignee" | "priority" | "tag"`）及对应的中文标签映射 `KANBAN_GROUP_BY_LABEL`，供切换控件与组件复用。

- [x] Task 2: 重构 TaskKanban 支持按维度动态分组：改造 [task-kanban.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/tasks/task-kanban.tsx)，使其接收 `groupBy`、`users`、`projects` 等 props，并按维度动态生成列与分组结果。
  - [x] SubTask 2.1: 扩展组件 props，新增 `groupBy: KanbanGroupBy`、`users`、`projects`；`TaskItem` 接口补充 `project` 字段。
  - [x] SubTask 2.2: 实现 `buildColumns(groupBy, tasks, users, projects)`：为每个维度生成 `{ key, label, color, droppableId }[]` 列定义（状态/优先级用固定顺序常量；负责人/项目用数据源生成并含「未分配/暂不关联」兜底列；标签用任务中出现的标签集合并含「无标签」兜底列）。
  - [x] SubTask 2.3: 实现 `groupTasks(groupBy, columns, tasks)`：按维度把任务分配到列；标签维度下一个任务可出现在多个列。
  - [x] SubTask 2.4: 重构 `KanbanColumn`/`KanbanCard` 使用通用列定义（标题文案与颜色 badge），移除写死的 `TASK_STATUS_*` 依赖渲染列头。

- [x] Task 3: 按维度路由拖拽更新：在 [task-kanban.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/tasks/task-kanban.tsx) 中将 `onDragEnd` 由「仅更新 status」改为按 `groupBy` 更新对应字段。
  - [x] SubTask 3.1: 根据落点列的 key 与当前 `groupBy`，组装 PUT body（`status` / `priority` / `assigneeId` / `projectId`，含 null 兜底）。
  - [x] SubTask 3.2: 标签维度禁用拖拽（不注册 sortable 拖拽更新或在 `onDragEnd` 直接返回），并对成功更新给出 toast 提示。
  - [x] SubTask 3.3: 标签维度下使用复合的 sortable id（如 `${taskId}::${tag}`）以避免同一任务多列重复 id 冲突，仅用于渲染，不触发更新。

- [x] Task 4: 在 TasksPage 接入分组切换控件：改造 [tasks-page.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/tasks/tasks-page.tsx)。
  - [x] SubTask 4.1: 新增本地状态 `groupBy`（默认 `"status"`）。
  - [x] SubTask 4.2: 在看板模式下、视图切换器旁渲染「分组方式」下拉选择控件（仅 `viewMode === "kanban"` 时显示）。
  - [x] SubTask 4.3: 向 `TaskKanban` 传入 `groupBy`、`users`、`projects`。

- [x] Task 5: 构建校验与手动验证：运行类型检查/构建确保无错误，并在浏览器中验证各分组维度的列生成、拖拽更新与标签只读行为。

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3 依赖 Task 2
- Task 4 依赖 Task 1、Task 2
- Task 5 依赖 Task 3、Task 4
