import { db } from "@/lib/db";

type RawSqlDb = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<unknown>;
};

type TableColumn = { name: string };

const globalForMigrations = globalThis as unknown as {
  meegoLiteSchemaMigrationPromise?: Promise<void>;
};

async function tableExists(client: RawSqlDb, tableName: string) {
  const tables = await client.$queryRawUnsafe<TableColumn[]>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = '${tableName}'`
  );

  return tables.length > 0;
}

async function getTableColumns(client: RawSqlDb, tableName: string) {
  return client.$queryRawUnsafe<TableColumn[]>(
    `PRAGMA table_info('${tableName}')`
  );
}

async function rebuildTaskTableWithoutProgress(client: RawSqlDb) {
  await client.$executeRawUnsafe('PRAGMA foreign_keys=OFF');
  try {
    await client.$executeRawUnsafe(`CREATE TABLE "Task_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT NOT NULL DEFAULT 'p2',
    "deadline" DATETIME,
    "tags" TEXT,
    "estimatedHours" REAL,
    "actualHours" REAL,
    "creatorId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "projectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
)`);
    await client.$executeRawUnsafe(`INSERT INTO "Task_new" (
    "id", "title", "description", "status", "priority", "deadline", "tags",
    "estimatedHours", "actualHours", "creatorId", "assigneeId", "projectId",
    "createdAt", "updatedAt"
)
SELECT
    "id", "title", "description", "status", "priority", "deadline", "tags",
    "estimatedHours", "actualHours", "creatorId", "assigneeId", "projectId",
    "createdAt", "updatedAt"
FROM "Task"`);
    await client.$executeRawUnsafe('DROP TABLE "Task"');
    await client.$executeRawUnsafe('ALTER TABLE "Task_new" RENAME TO "Task"');
  } finally {
    await client.$executeRawUnsafe('PRAGMA foreign_keys=ON');
  }
}

async function rebuildProgressUpdateTable(client: RawSqlDb, sourceHasStatus: boolean) {
  const statusExpression = sourceHasStatus
    ? `COALESCE("status", 'todo')`
    : `COALESCE((SELECT "status" FROM "Task" WHERE "Task"."id" = "ProgressUpdate"."taskId"), 'todo')`;

  await client.$executeRawUnsafe('PRAGMA foreign_keys=OFF');
  try {
    await client.$executeRawUnsafe(`CREATE TABLE "ProgressUpdate_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgressUpdate_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgressUpdate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`);
    await client.$executeRawUnsafe(`INSERT INTO "ProgressUpdate_new" (
    "id", "taskId", "userId", "status", "content", "createdAt"
)
SELECT
    "id",
    "taskId",
    "userId",
    ${statusExpression},
    "content",
    "createdAt"
FROM "ProgressUpdate"`);
    await client.$executeRawUnsafe('DROP TABLE "ProgressUpdate"');
    await client.$executeRawUnsafe(
      'ALTER TABLE "ProgressUpdate_new" RENAME TO "ProgressUpdate"'
    );
  } finally {
    await client.$executeRawUnsafe('PRAGMA foreign_keys=ON');
  }
}

async function ensureColumn(
  client: RawSqlDb,
  tableName: string,
  columnName: string,
  columnDefinition: string
) {
  // 仅在表存在时才尝试加列；表不存在时由各自的 ensureXxxSchema 负责建表
  if (!(await tableExists(client, tableName))) {
    return;
  }
  const columns = await getTableColumns(client, tableName);
  if (columns.some((column) => column.name === columnName)) {
    return;
  }
  await client.$executeRawUnsafe(
    `ALTER TABLE "${tableName}" ADD COLUMN ${columnDefinition}`
  );
}

export async function ensureUserSchema(client: RawSqlDb) {
  // User 表的所有可选/有默认值的新增字段
  await ensureColumn(client, "User", "deletedAt", '"deletedAt" DATETIME');
  await ensureColumn(client, "User", "passwordHash", '"passwordHash" TEXT');
  await ensureColumn(client, "User", "feishuId", '"feishuId" TEXT');
  await ensureColumn(client, "User", "wecomId", '"wecomId" TEXT');
  await ensureColumn(
    client,
    "User",
    "sessionVersion",
    '"sessionVersion" INTEGER NOT NULL DEFAULT 0'
  );
  await ensureColumn(
    client,
    "User",
    "notifyEmail",
    '"notifyEmail" BOOLEAN NOT NULL DEFAULT 1'
  );
  await ensureColumn(
    client,
    "User",
    "notifyFeishu",
    '"notifyFeishu" BOOLEAN NOT NULL DEFAULT 0'
  );
  await ensureColumn(
    client,
    "User",
    "notifyWeCom",
    '"notifyWeCom" BOOLEAN NOT NULL DEFAULT 0'
  );
  await ensureColumn(client, "User", "feishuWebhook", '"feishuWebhook" TEXT');
  await ensureColumn(client, "User", "wecomWebhook", '"wecomWebhook" TEXT');
  await ensureColumn(
    client,
    "User",
    "leadTimeMinutes",
    '"leadTimeMinutes" INTEGER NOT NULL DEFAULT 60'
  );
  await ensureColumn(client, "User", "openaiApiKey", '"openaiApiKey" TEXT');
  await ensureColumn(client, "User", "openaiBaseUrl", '"openaiBaseUrl" TEXT');
  await ensureColumn(client, "User", "openaiModel", '"openaiModel" TEXT');
  await ensureColumn(
    client,
    "User",
    "reportSummaryStyle",
    '"reportSummaryStyle" TEXT'
  );
}

export async function ensureTaskSchema(client: RawSqlDb) {
  await ensureColumn(client, "Task", "projectId", '"projectId" TEXT');
  await ensureColumn(client, "Task", "tags", '"tags" TEXT');
  await ensureColumn(client, "Task", "estimatedHours", '"estimatedHours" REAL');
  await ensureColumn(client, "Task", "actualHours", '"actualHours" REAL');

  if (!(await tableExists(client, "Task"))) {
    return;
  }

  const columns = await getTableColumns(client, "Task");
  if (columns.some((column) => column.name === "progress")) {
    await rebuildTaskTableWithoutProgress(client);
  }
}

export async function ensureProjectSchema(client: RawSqlDb) {
  if (!(await tableExists(client, "Project"))) {
    await client.$executeRawUnsafe(`CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "priority" TEXT NOT NULL DEFAULT 'p2',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
)`);
  }

  await ensureColumn(client, "Project", "creatorId", '"creatorId" TEXT');

  if (!(await tableExists(client, "_ProjectOwners"))) {
    await client.$executeRawUnsafe(`CREATE TABLE "_ProjectOwners" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProjectOwners_A_fkey" FOREIGN KEY ("A") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProjectOwners_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`);
  }

  await client.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS "_ProjectOwners_AB_unique" ON "_ProjectOwners"("A", "B")'
  );
  await client.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "_ProjectOwners_B_index" ON "_ProjectOwners"("B")'
  );
}

export async function ensureCommentSchema(client: RawSqlDb) {
  if (!(await tableExists(client, "Comment"))) {
    await client.$executeRawUnsafe(`CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`);
  }

  await client.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "Comment_taskId_index" ON "Comment"("taskId")'
  );
  await client.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "Comment_userId_index" ON "Comment"("userId")'
  );
}

export async function ensureProgressSchema(client: RawSqlDb) {
  if (!(await tableExists(client, "ProgressUpdate"))) {
    await client.$executeRawUnsafe(`CREATE TABLE "ProgressUpdate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgressUpdate_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgressUpdate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`);
  } else {
    const columns = await getTableColumns(client, "ProgressUpdate");
    const hasStatus = columns.some((column) => column.name === "status");
    const hasPercent = columns.some((column) => column.name === "percent");

    if (!hasStatus || hasPercent) {
      await rebuildProgressUpdateTable(client, hasStatus);
    }
  }

  await client.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "ProgressUpdate_taskId_index" ON "ProgressUpdate"("taskId")'
  );
}

export async function ensureNotificationSchema(client: RawSqlDb) {
  if (!(await tableExists(client, "Notification"))) {
    await client.$executeRawUnsafe(`CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" DATETIME,
    "readAt" DATETIME,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`);
  }

  await client.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "Notification_userId_index" ON "Notification"("userId")'
  );
  await client.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "Notification_taskId_index" ON "Notification"("taskId")'
  );
  await client.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "Notification_status_index" ON "Notification"("status")'
  );
}

export async function ensureVerificationCodeSchema(client: RawSqlDb) {
  if (!(await tableExists(client, "VerificationCode"))) {
    await client.$executeRawUnsafe(`CREATE TABLE "VerificationCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
  }

  await client.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "VerificationCode_email_purpose_index" ON "VerificationCode"("email","purpose")'
  );
}

export async function ensureReportSchema(client: RawSqlDb) {
  if (!(await tableExists(client, "Report"))) {
    await client.$executeRawUnsafe(`CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'done',
    "error" TEXT,
    "content" TEXT NOT NULL,
    "meta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`);
  }

  // 旧库平滑升级：补充 status / error 列
  await ensureColumn(
    client,
    "Report",
    "status",
    `"status" TEXT NOT NULL DEFAULT 'done'`
  );
  await ensureColumn(client, "Report", "error", '"error" TEXT');

  await client.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "Report_userId_createdAt_index" ON "Report"("userId","createdAt")'
  );
}

export function ensureDatabaseSchema() {
  if (!globalForMigrations.meegoLiteSchemaMigrationPromise) {
    const promise = (async () => {
      // 顺序：先建表 / 加表级字段，再补可选列
      await ensureUserSchema(db);
      await ensureProjectSchema(db);
      await ensureTaskSchema(db);
      await ensureCommentSchema(db);
      await ensureProgressSchema(db);
      await ensureNotificationSchema(db);
      await ensureVerificationCodeSchema(db);
      await ensureReportSchema(db);
    })();

    // 失败时清空缓存，避免一次失败后所有请求永久卡死
    promise.catch(() => {
      globalForMigrations.meegoLiteSchemaMigrationPromise = undefined;
    });

    globalForMigrations.meegoLiteSchemaMigrationPromise = promise;
  }

  return globalForMigrations.meegoLiteSchemaMigrationPromise;
}
