import { db } from "@/lib/db";

type RawSqlDb = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<unknown>;
};

type TableColumn = { name: string };

const USER_DELETED_AT_COLUMN = "deletedAt";
const USER_PASSWORD_HASH_COLUMN = "passwordHash";
const TASK_PROJECT_ID_COLUMN = "projectId";
const PROJECT_CREATOR_ID_COLUMN = "creatorId";

const globalForMigrations = globalThis as unknown as {
  meegoLiteSchemaMigrationPromise?: Promise<void>;
};

export async function ensureUserDeletedAtColumn(client: RawSqlDb) {
  const columns = await client.$queryRawUnsafe<TableColumn[]>(
    "PRAGMA table_info('User')"
  );

  if (columns.some((column) => column.name === USER_DELETED_AT_COLUMN)) {
    return;
  }

  await client.$executeRawUnsafe(
    'ALTER TABLE "User" ADD COLUMN "deletedAt" DATETIME'
  );
}

export async function ensureUserPasswordHashColumn(client: RawSqlDb) {
  const columns = await client.$queryRawUnsafe<TableColumn[]>(
    "PRAGMA table_info('User')"
  );

  if (columns.some((column) => column.name === USER_PASSWORD_HASH_COLUMN)) {
    return;
  }

  await client.$executeRawUnsafe(
    'ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT'
  );
}

async function tableExists(client: RawSqlDb, tableName: string) {
  const tables = await client.$queryRawUnsafe<TableColumn[]>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = '${tableName}'`
  );

  return tables.length > 0;
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

  const taskColumns = await client.$queryRawUnsafe<TableColumn[]>(
    "PRAGMA table_info('Task')"
  );
  if (!taskColumns.some((column) => column.name === TASK_PROJECT_ID_COLUMN)) {
    await client.$executeRawUnsafe(
      'ALTER TABLE "Task" ADD COLUMN "projectId" TEXT'
    );
  }

  const projectColumns = await client.$queryRawUnsafe<TableColumn[]>(
    "PRAGMA table_info('Project')"
  );
  if (
    !projectColumns.some((column) => column.name === PROJECT_CREATOR_ID_COLUMN)
  ) {
    await client.$executeRawUnsafe(
      'ALTER TABLE "Project" ADD COLUMN "creatorId" TEXT'
    );
  }

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

export async function ensureProgressSchema(client: RawSqlDb) {
  if (!(await tableExists(client, "ProgressUpdate"))) {
    await client.$executeRawUnsafe(`CREATE TABLE "ProgressUpdate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "percent" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgressUpdate_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgressUpdate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`);
  }

  await client.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "ProgressUpdate_taskId_index" ON "ProgressUpdate"("taskId")'
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

export function ensureDatabaseSchema() {
  globalForMigrations.meegoLiteSchemaMigrationPromise ??= (async () => {
    await ensureUserDeletedAtColumn(db);
    await ensureUserPasswordHashColumn(db);
    await ensureProjectSchema(db);
    await ensureProgressSchema(db);
    await ensureVerificationCodeSchema(db);
  })();

  return globalForMigrations.meegoLiteSchemaMigrationPromise;
}
