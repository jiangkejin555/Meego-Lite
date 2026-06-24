# Tasks

- [x] Task 1: 收敛后端进度模型为“状态 + 描述”的过程记录：从数据模型、接口和类型系统中移除百分比相关字段。
  - [x] SubTask 1.1: 更新 `prisma/schema.prisma`，删除 `Task.progress` 与 `ProgressUpdate.percent`，为 `ProgressUpdate` 增加 `status` 字段，并重新生成 Prisma Client
  - [x] SubTask 1.2: 更新 `src/lib/db-migrations.ts`，补充旧库向新结构迁移的兼容逻辑，确保运行时 schema 与 Prisma 定义一致
  - [x] SubTask 1.3: 更新 `src/app/api/progress/route.ts` 与 `src/app/api/progress/[id]/route.ts`，使创建/编辑围绕 `content` 工作，记录里返回 `status`，空描述直接报错
  - [x] SubTask 1.4: 更新 `src/app/api/tasks/route.ts` 与 `src/app/api/tasks/[id]/route.ts`，在任务创建和任务状态变化时自动追加过程记录；列表/详情接口仅暴露最新进度描述与描述时间线，移除 `progress`、`latestProgressPercent` 等旧字段

- [x] Task 2: 调整「我的任务」列表交互：用“进度描述”替换“进度”，去掉百分比快捷修改能力。
  - [x] SubTask 2.1: 更新 `src/components/tasks/task-list.tsx` 与 `src/components/tasks/tasks-page.tsx` 的类型和列定义，表头改为“进度描述”
  - [x] SubTask 2.2: 移除列表里的百分比展示、状态标签、百分比快捷档、默认“当前进度 X%”文案，仅保留描述录入或详情跳转所需的最小交互
  - [x] SubTask 2.3: 处理空状态、超长描述截断和刷新逻辑，保证列表更新后能立即看到最新描述

- [x] Task 3: 调整任务详情页和编辑页：将“完成进度”改为“进度描述 / 过程记录”。
  - [x] SubTask 3.1: 更新 `src/components/tasks/task-detail.tsx`，移除进度条和百分比概览区，在原百分比位置改为状态 Tag，保留只读时间线
  - [x] SubTask 3.2: 更新 `src/components/tasks/task-form.tsx`，删除百分比快捷按钮、自定义数字输入和相关状态，仅保留文本记录的新增、编辑、删除
  - [x] SubTask 3.3: 统一文案为“进度描述”或“过程记录”，并在详情页、编辑页的记录项中展示对应任务状态 Tag，避免界面上残留“完成进度”“百分比”等旧语义

- [x] Task 4: 清理周边受影响模块：让报表、看板和初始化数据与新的描述语义一致。
  - [x] SubTask 4.1: 更新 `src/lib/report-aggregate.ts` 与 `src/lib/constants.ts` 中关于“进度百分比”的聚合文案和提示词描述，改为记录状态与过程描述
  - [x] SubTask 4.2: 更新 `src/components/tasks/task-kanban.tsx`，移除任务卡片上的百分比展示
  - [x] SubTask 4.3: 更新 `src/app/api/seed/route.ts` 与其他示例/假数据来源，移除 `progress` 初始值和 `percent` 示例，补齐 `status` 型过程记录样例，避免新老语义混用

- [x] Task 5: 回归验证：确认任务流程从录入到展示均已切换为“进度描述”。
  - [x] SubTask 5.1: 运行 `npm run lint`
  - [x] SubTask 5.2: 运行 `npx tsc --noEmit`
  - [x] SubTask 5.3: 手动验证任务创建自动记首条记录、任务状态变更自动记记录，以及「我的任务」列表、任务详情、编辑弹窗、看板、AI 报告生成文案不再出现百分比进度语义

- [x] Task 6: 修复 Task 5 回归验证失败项，并完成二次验证。
  - [x] SubTask 6.1: 清理剩余的旧接口类型字段，移除 `src/components/tasks/task-detail.tsx` 与 `src/components/tasks/task-form.tsx` 中残留的 `progress: number`
  - [x] SubTask 6.2: 修复 `src/app/api/tasks/[id]/route.ts` 中 `nextStatus` 的类型收敛，确保状态变更自动追加过程记录逻辑通过 TypeScript 校验
  - [x] SubTask 6.3: 清理 `src/lib/report-generate.ts` 中对 `progressUpdate.percent` 的残留引用，统一 AI 报告文案为“状态 + 过程描述”语义
  - [x] SubTask 6.4: 修复后重新运行 `npx tsc --noEmit`，并重新验证 checklist 中“模型/类型移除百分比”和“AI 报告文案无百分比语义”两个 checkpoint

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3 依赖 Task 1
- Task 4 依赖 Task 1
- Task 5 依赖 Task 2 / Task 3 / Task 4
- Task 2、Task 3、Task 4 在完成 Task 1 后可并行
