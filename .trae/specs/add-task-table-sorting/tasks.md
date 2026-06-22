# Tasks

- [x] Task 1: 在常量中新增排序顺序定义
  - [x] SubTask 1.1: 在 [src/lib/constants.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/lib/constants.ts) 新增 `TASK_STATUS_SORT_ORDER`（待开始→进行中→已完成→已关闭→已暂停）映射为各状态的排序权重
  - [x] SubTask 1.2: 在 [src/lib/constants.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/lib/constants.ts) 新增 `TASK_PRIORITY_SORT_ORDER`（p0→p1→p2→p3）排序权重

- [x] Task 2: 在任务列表实现排序逻辑与列头交互
  - [x] SubTask 2.1: 在 [task-list.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/tasks/task-list.tsx) 增加排序状态（排序键 + 方向），默认 `project` 升序
  - [x] SubTask 2.2: 实现各列比较函数（项目名 / 状态权重 / 优先级权重 / 截止时间(空值最后) / 负责人名(空值最后)），用 `useMemo` 生成 `sortedTasks`
  - [x] SubTask 2.3: 将「项目」「状态」「优先级」「截止时间」「责任人」5 个 `TableHead` 改为可点击按钮，显示当前排序方向图标（如 ArrowUp/ArrowDown，非排序列显示中性图标）
  - [x] SubTask 2.4: 表格 body 渲染改为遍历 `sortedTasks`；底部「共 N 条结果」保持基于 tasks 总数

- [x] Task 3: 验证与自测
  - [x] SubTask 3.1: 运行类型检查/构建（如 `npm run build` 或 lint）确认无类型错误
  - [x] SubTask 3.2: 启动 dev server，在浏览器中验证默认按项目排序、各列点击升降序切换、状态自定义顺序、长期任务/未分配排末尾

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
