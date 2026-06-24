# Meego Lite SQLite 使用指南

> 本文档用于快速查看、排查和维护 Meego Lite 的 SQLite 数据库，覆盖本地开发库、线上生产库、Docker 数据库以及常用 `sqlite3` 命令。

---

## 目录

- [一、数据库文件在哪里](#一数据库文件在哪里)
- [二、进入 SQLite 命令行](#二进入-sqlite-命令行)
- [三、查看表结构](#三查看表结构)
- [四、查看表数据](#四查看表数据)
- [五、常用排查 SQL](#五常用排查-sql)
- [六、更新表结构](#六更新表结构)
- [七、备份与恢复](#七备份与恢复)
- [八、Docker 场景](#八docker-场景)
- [九、注意事项](#九注意事项)

---

## 一、数据库文件在哪里

### 1. 本地开发环境

本地开发通常使用：

```bash
prisma/dev.db
```

进入项目目录后可以这样打开：

```bash
sqlite3 prisma/dev.db
```

### 2. 阿里云 / 线上 Makefile 部署

`Makefile` 中默认生产库路径是：

```text
$(APP_DIR)/prisma/prod.db
```

如果你在服务器项目目录内，例如 `/home/admin/kejin/Meego-Lite`，则实际路径通常是：

```bash
/home/admin/kejin/Meego-Lite/prisma/prod.db
```

进入项目目录后可以这样打开：

```bash
sqlite3 prisma/prod.db
```

### 3. 通过环境变量确认

如果不确定当前服务使用哪个库，先看环境变量：

```bash
echo $DATABASE_URL
```

SQLite 的连接串通常长这样：

```text
file:./prisma/dev.db
file:/home/admin/kejin/Meego-Lite/prisma/prod.db
```

---

## 二、进入 SQLite 命令行

### 打开本地开发库

```bash
sqlite3 prisma/dev.db
```

### 打开线上生产库

```bash
sqlite3 prisma/prod.db
```

进入后建议先开启表格展示：

```sql
.headers on
.mode column
```

退出 SQLite：

```sql
.quit
```

---

## 三、查看表结构

### 查看所有表

```sql
.tables
```

### 查看某张表的建表 SQL

```sql
.schema ProgressUpdate
```

也可以查看全部表结构：

```sql
.schema
```

### 查看字段列表

推荐用 `PRAGMA table_info` 看字段、类型、是否必填、默认值：

```sql
PRAGMA table_info('ProgressUpdate');
```

示例：查看任务表字段：

```sql
PRAGMA table_info('Task');
```

### 查看索引

```sql
PRAGMA index_list('ProgressUpdate');
```

查看某个索引包含哪些字段：

```sql
PRAGMA index_info('ProgressUpdate_taskId_index');
```

---

## 四、查看表数据

### 查看前 10 条数据

```sql
SELECT * FROM ProgressUpdate LIMIT 10;
```

### 按时间倒序查看

```sql
SELECT * FROM ProgressUpdate ORDER BY createdAt DESC LIMIT 10;
```

### 只看指定字段

```sql
SELECT id, taskId, userId, status, content, createdAt
FROM ProgressUpdate
ORDER BY createdAt DESC
LIMIT 10;
```

### 查看总数

```sql
SELECT COUNT(*) FROM ProgressUpdate;
```

### 按状态统计任务

```sql
SELECT status, COUNT(*) AS count
FROM Task
GROUP BY status
ORDER BY count DESC;
```

### 按项目查看任务

```sql
SELECT
  Task.id,
  Task.title,
  Task.status,
  Task.priority,
  Project.name AS projectName
FROM Task
LEFT JOIN Project ON Project.id = Task.projectId
ORDER BY Task.createdAt DESC
LIMIT 20;
```

---

## 五、常用排查 SQL

### 1. 检查 `ProgressUpdate` 是否包含 `status` 字段

```sql
PRAGMA table_info('ProgressUpdate');
```

正常应能看到：

```text
status
content
createdAt
```

### 2. 查看最近创建的任务及负责人

```sql
SELECT
  Task.id,
  Task.title,
  Task.status,
  Task.priority,
  creator.name AS creatorName,
  assignee.name AS assigneeName,
  Task.createdAt
FROM Task
JOIN User AS creator ON creator.id = Task.creatorId
LEFT JOIN User AS assignee ON assignee.id = Task.assigneeId
ORDER BY Task.createdAt DESC
LIMIT 20;
```

### 3. 查看某个任务的进展记录

把 `TASK_ID` 替换成实际任务 ID：

```sql
SELECT
  ProgressUpdate.id,
  User.name AS userName,
  ProgressUpdate.status,
  ProgressUpdate.content,
  ProgressUpdate.createdAt
FROM ProgressUpdate
JOIN User ON User.id = ProgressUpdate.userId
WHERE ProgressUpdate.taskId = 'TASK_ID'
ORDER BY ProgressUpdate.createdAt DESC;
```

### 4. 检查报告生成记录

```sql
SELECT id, type, title, status, error, createdAt, updatedAt
FROM Report
ORDER BY createdAt DESC
LIMIT 20;
```

### 5. 查看用户配置是否存在

```sql
SELECT
  id,
  name,
  email,
  openaiBaseUrl,
  openaiModel,
  CASE
    WHEN openaiApiKey IS NULL OR openaiApiKey = '' THEN 'empty'
    ELSE 'configured'
  END AS apiKeyStatus
FROM User
ORDER BY createdAt ASC;
```

---

## 六、更新表结构

### 本地开发库

本地开发环境同步 Prisma schema 到 SQLite：

```bash
bun run db:generate
bun run db:push
```

对应 `package.json`：

```bash
prisma generate
prisma db push
```

### 线上生产库

线上使用 `Makefile` 时，更新 DB 表结构的命令是：

```bash
make db-push
```

它实际执行：

```bash
DATABASE_URL="file:$(DB_PATH)" bunx prisma generate
DATABASE_URL="file:$(DB_PATH)" bunx prisma db push --skip-generate --accept-data-loss=false
```

日常发布时执行：

```bash
make update
```

`make update` 会先备份数据库，然后自动调用 `make db-push`，再构建并重启服务。

---

## 七、备份与恢复

### 1. 使用 Makefile 备份线上库

```bash
make db-backup
```

默认备份目录：

```text
/opt/backup
```

备份文件名类似：

```text
prod-20260624-153000.db
```

### 2. 手动备份

```bash
cp prisma/prod.db prisma/prod.db.bak
```

如果开启了 WAL 模式，可能还会有：

```text
prisma/prod.db-wal
prisma/prod.db-shm
```

更稳妥的在线备份方式是使用 SQLite 自带 `.backup`：

```bash
sqlite3 prisma/prod.db ".backup '/opt/backup/prod-$(date +%Y%m%d-%H%M%S).db'"
```

### 3. 恢复备份

恢复前建议先停服务：

```bash
make stop
```

替换数据库文件：

```bash
cp /opt/backup/prod-YYYYMMDD-HHMMSS.db prisma/prod.db
```

重启服务：

```bash
make start
```

---

## 八、Docker 场景

Docker Compose 中数据库连接串是：

```text
DATABASE_URL=file:/app/db/custom.db
```

数据库保存在 Docker volume：

```text
meego-db
```

### 进入容器查看数据库

```bash
docker compose exec meego-lite sh
sqlite3 /app/db/custom.db
```

如果容器内没有 `sqlite3`，可以临时用宿主机或单独容器挂载 volume 后查看。

### 查看容器日志

```bash
docker compose logs -f meego-lite
```

### 注意不要删除数据卷

这个命令会停止并清理容器，但保留数据：

```bash
docker compose down
```

这个命令会删除数据库 volume，数据会丢失：

```bash
docker compose down -v
```

---

## 九、注意事项

1. 线上操作数据库前，优先执行备份：

```bash
make db-backup
```

2. 查询数据时优先加 `LIMIT`，避免一次输出太多：

```sql
SELECT * FROM Task LIMIT 20;
```

3. 不建议在线上直接手写 `UPDATE` / `DELETE`，除非已经备份且确认影响范围。

4. 线上同步表结构优先使用：

```bash
make db-push
```

5. 如果修改了 `prisma/schema.prisma`，但运行时报字段不存在或类型不对，通常需要重新生成 Prisma Client：

```bash
bunx prisma generate
```

本地也可以执行：

```bash
npm run db:generate
```

