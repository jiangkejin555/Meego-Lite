# Checklist

- [x] `prisma/schema.prisma` 中 `Task.type` 字段已移除，且 DB 结构已同步（db push）
- [x] 全代码库无残留 `TaskType` / `TASK_TYPE_LABEL` / `TASK_TYPE_COLOR` / `.type` 任务类型引用
- [x] `src/lib/constants.ts` 提供稳定的标签配色工具，同名标签同色、配色不足时取模复用且不报错
- [x] `GET /api/tags` 返回去重、去空、稳定排序的标签数组 `{ tags: string[] }`
- [x] `GET /api/tasks` 支持按 `tag` 过滤，且移除了 `type` 过滤
- [x] 创建/更新任务接口不再接收或写入 `type`，`tags` 正常持久化
- [x] `/api/stats` 返回结果不含 `type` 分布字段，Dashboard 无「类型分布」卡片且正常渲染
- [x] 任务列表表格「类型」列已替换为「标签」列，标签彩色展示，过多时显示「+N」
- [x] 筛选栏「类型」下拉框已替换为「标签」下拉框，选项来自接口，可正确筛选，重置生效
- [x] 新建/编辑弹窗已移除「类型」选择项
- [x] 新建/编辑弹窗标签输入支持选择已有标签（去重）与自定义新标签，保存后生效
- [x] 看板卡片与详情抽屉已移除「类型」徽章/字段，标签彩色展示
- [x] `bun run lint` 与类型检查通过，dev server 启动无报错，核心流程手测通过
