# Checklist

## 数据与后端
- [x] `ProgressUpdate` 模型已在 schema.prisma 定义，含 content、percent(可选)、taskId、userId、createdAt，并随 Task 级联删除
- [x] `ensureProgressSchema` 已加入 db-migrations.ts 并在 `ensureDatabaseSchema` 中调用，首次访问能自动建表
- [x] `GET /api/progress?taskId=` 按时间倒序返回记录并含作者信息
- [x] `POST /api/progress` 文字为空时返回错误；含 percent 时同步写回 `Task.progress`
- [x] `PATCH/DELETE /api/progress/[id]` 仅作者可操作（非作者 403）；percent 变更/删除后正确重算 `Task.progress`（无带百分比记录时为 0）
- [x] `GET /api/tasks/[id]` 返回结果包含 `progressUpdates`

## 详情页（只读）
- [x] 完成进度区展示概览百分比 + 进度条 + 最新一条进度常驻
- [x] 「查看历史进度 (N)」可展开/收起按时间倒序的只读时间线
- [x] 详情页进度区不含任何输入/编辑/删除控件
- [x] 无记录时显示「暂无进度更新」占位

## 编辑弹窗（写入口）
- [x] 原进度滑块已移除；「完成进度」单独整排，截止时间仍在两列网格内
- [x] 文字输入框 + 百分比快捷按钮(0/25/50/75/100 + 手填) + 「添加进度」可成功新增并即时刷新
- [x] 只写文字不填百分比时记录成功且任务当前进度不变
- [x] 历史记录作者本人可编辑/删除并即时生效

## 我的任务列表
- [x] 进度列已移动到状态列之后
- [x] 进度单元格可通过快捷弹层档位改进度，并支持快捷输入文字
- [x] 行内修改后生成进度记录、更新当前进度并刷新列表/统计

## 回归与校验
- [x] 看板卡片、仪表盘的进度百分比显示正确
- [x] 进度更新过程不产生任何通知
- [x] `npm run lint` 通过（typecheck `npx tsc --noEmit` 一并通过）
