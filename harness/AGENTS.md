# harness/AGENTS.md

本目录是 Meego Lite 项目的 agent 工作控制中枢，存放持久化状态文件和启动脚本。

## 目录说明

| 文件 | 用途 |
|------|------|
| `feature_list.json` | 功能状态的唯一事实来源，记录所有功能及完成状态 |
| `claude-progress.md` | 会话进度和当前已验证状态，每轮会话结束后更新 |
| `init.sh` | 统一的启动与验证入口脚本，新会话开始时执行 |
| `session-handoff.md` | 较长会话可选的交接摘要 |
| `AGENTS.md` | 本文件，说明 harness 目录的用途和各文件规范 |

## feature_list.json 规范

```json
{
  "version": "1.0",
  "lastUpdated": "2026-06-24T00:00:00Z",
  "features": [
    {
      "id": "feat-001",
      "name": "功能名称",
      "description": "功能描述",
      "status": "pending | in_progress | done | blocked",
      "priority": "p0 | p1 | p2 | p3",
      "createdAt": "2026-06-24T00:00:00Z",
      "completedAt": null,
      "blocker": null,
      "notes": ""
    }
  ]
}
```

## claude-progress.md 规范

每轮会话结束后更新，包含：

1. **会话时间**: 开始和结束时间
2. **已完成工作**: 本轮实现的功能和修改
3. **验证状态**: 哪些验证已通过（构建、功能测试等）
4. **下一步**: 优先级最高的待办事项
5. **已知风险**: 未解决的 blocker 或技术债务

## init.sh 规范

启动脚本应当：

1. 检查 Node.js / Bun 环境
2. 检查依赖是否安装（`node_modules` 存在）
3. 检查数据库是否初始化（`prisma/dev.db` 存在）
4. 运行 `bun run db:generate` 确保 Prisma Client 最新
5. 执行基础 smoke test（如 `bun run build` 或启动 dev server 验证）
6. 输出当前项目状态摘要

## 使用流程

```bash
# 新会话开始时
./harness/init.sh

# 查看当前进度
cat harness/claude-progress.md

# 查看功能列表
cat harness/feature_list.json

# 会话结束后更新
# 1. 编辑 harness/claude-progress.md
# 2. 编辑 harness/feature_list.json
# 3. git add harness/ && git commit -m "更新进度: xxx"
```
