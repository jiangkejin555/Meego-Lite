# Tasks

- [x] Task 1: 数据模型与运行时建表：新增 `ProgressUpdate` 模型并支持自动建表
  - [x] SubTask 1.1: 在 [schema.prisma](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/prisma/schema.prisma) 新增 `ProgressUpdate`（id / taskId / userId / content / percent Int? / createdAt），并在 `Task`、`User` 上加反向关系；`onDelete: Cascade` 跟随 Task
  - [x] SubTask 1.2: 在 [db-migrations.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/lib/db-migrations.ts) 增加 `ensureProgressSchema`（参照 `ensureProjectSchema`：`CREATE TABLE IF NOT EXISTS "ProgressUpdate" ...`），并在 `ensureDatabaseSchema` 中调用
  - [x] SubTask 1.3: `npx prisma generate` 使 Prisma Client 识别新模型

- [x] Task 2: 后端接口：进度记录的增删改查（不发通知）
  - [x] SubTask 2.1: 新增 `src/app/api/progress/route.ts`：`GET ?taskId=`（按 createdAt desc 返回，include user）、`POST {taskId,userId,content,percent?}`（content 必填校验；创建记录；若 percent 为数字则同步 `Task.progress`）
  - [x] SubTask 2.2: 新增 `src/app/api/progress/[id]/route.ts`：`PATCH {userId,content?,percent?}`（仅作者，403 校验）、`DELETE ?userId=`（仅作者）；二者在涉及 percent 变化/删除后，按"最近一条带 percent 记录"重算并写回 `Task.progress`
  - [x] SubTask 2.3: 在 [tasks/[id]/route.ts](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/app/api/tasks/[id]/route.ts) 的 GET include 中加入 `progressUpdates`（include user, orderBy createdAt desc）

- [x] Task 3: 详情页只读进度时间线
  - [x] SubTask 3.1: 在 [task-detail.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/tasks/task-detail.tsx) 的 `TaskDetail` 接口加入 `progressUpdates` 字段
  - [x] SubTask 3.2: 将「完成进度」块（[task-detail.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/tasks/task-detail.tsx#L320-L327)）改为：概览百分比 + 进度条 + 最新一条常驻 + 「查看历史进度 (N)」折叠时间线（用 Collapsible），全程只读、无输入/编辑控件
  - [x] SubTask 3.3: 空状态显示「暂无进度更新」

- [x] Task 4: 编辑弹窗进度更新区（唯一写入口，独立即时保存）
  - [x] SubTask 4.1: 将「完成进度」从两列网格（[task-form.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/tasks/task-form.tsx#L480)）移出，作为独立整排区块；移除原滑块（[task-form.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/tasks/task-form.tsx#L650-L665)）及表单 `progress` 相关提交逻辑（[task-form.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/tasks/task-form.tsx#L383)）
  - [x] SubTask 4.2: 构建进度更新区：文字输入框 + 百分比快捷按钮(0/25/50/75/100 + 手填数字框) +「添加进度」按钮，调用 `POST /api/progress` 即时保存并刷新
  - [x] SubTask 4.3: 历史记录列表，每条作者本人可 编辑/删除，调用 `PATCH/DELETE /api/progress/[id]` 即时生效
  - [x] SubTask 4.4: 仅在编辑已有任务时显示该区（新建任务尚无 taskId，进度在创建后于编辑态补充）；处理 React Query 失效刷新（task / tasks / stats）

- [x] Task 5: 我的任务列表：列顺序调整 + 行内快捷改进度
  - [x] SubTask 5.1: 在 [task-list.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/tasks/task-list.tsx#L218-L226) 将「进度」列表头与单元格移动到「状态」列之后，调整 `colSpan` 与列宽
  - [x] SubTask 5.2: 将进度单元格（[task-list.tsx](file:///Users/bytedance/Desktop/KOK/沉淀/APP/meego-lite/src/components/tasks/task-list.tsx#L403-L407)）改为可点击的快捷弹层（参照状态列）：快捷档 0/25/50/75/100 + 一个可输入文字的小输入，确认后 `POST /api/progress`
  - [x] SubTask 5.3: 乐观态/loading（参照 `pendingStatusId`）与刷新（tasks / stats）

- [x] Task 6: 校验与回归
  - [x] SubTask 6.1: `npm run lint` 与（若有）`npx tsc --noEmit` 通过
  - [x] SubTask 6.2: 手动验证：详情只读时间线、编辑弹窗增删改即时保存、列表行内改进度、看板/仪表盘百分比仍正确

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3 依赖 Task 2（需要 GET 返回 progressUpdates）
- Task 4 依赖 Task 2
- Task 5 依赖 Task 2
- Task 6 依赖 Task 3 / Task 4 / Task 5
- Task 3、Task 4、Task 5 之间相互独立，可并行
