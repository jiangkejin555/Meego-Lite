import { describe, expect, test } from "bun:test";
import {
  ensureProjectSchema,
  ensureUserDeletedAtColumn,
} from "./db-migrations";

type QueryRow = { name: string };

function createFakeDb({
  columns = [],
  tables = [],
}: {
  columns?: QueryRow[];
  tables?: QueryRow[];
}) {
  const statements: string[] = [];
  return {
    statements,
    db: {
      $queryRawUnsafe: async <T = unknown>(sql: string) => {
        statements.push(sql);
        if (sql.includes("sqlite_master")) {
          return tables as T;
        }
        return columns as T;
      },
      $executeRawUnsafe: async (sql: string) => {
        statements.push(sql);
        return 0;
      },
    },
  };
}

describe("SQLite schema 自动升级", () => {
  test("User 表缺少 deletedAt 时自动补列", async () => {
    const { db, statements } = createFakeDb({
      columns: [{ name: "id" }, { name: "name" }, { name: "email" }],
    });

    await ensureUserDeletedAtColumn(db);

    expect(statements).toEqual([
      "PRAGMA table_info('User')",
      'ALTER TABLE "User" ADD COLUMN "deletedAt" DATETIME',
    ]);
  });

  test("User 表已有 deletedAt 时不重复补列", async () => {
    const { db, statements } = createFakeDb({
      columns: [{ name: "id" }, { name: "deletedAt" }],
    });

    await ensureUserDeletedAtColumn(db);

    expect(statements).toEqual(["PRAGMA table_info('User')"]);
  });

  test("旧库缺少 Project 相关结构时自动创建表和补 Task.projectId", async () => {
    const { db, statements } = createFakeDb({
      tables: [],
      columns: [{ name: "id" }, { name: "title" }],
    });

    await ensureProjectSchema(db);

    expect(statements).toEqual([
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Project'",
      expect.stringContaining('CREATE TABLE "Project"'),
      "PRAGMA table_info('Task')",
      'ALTER TABLE "Task" ADD COLUMN "projectId" TEXT',
      "PRAGMA table_info('Project')",
      'ALTER TABLE "Project" ADD COLUMN "creatorId" TEXT',
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_ProjectOwners'",
      expect.stringContaining('CREATE TABLE "_ProjectOwners"'),
      'CREATE UNIQUE INDEX IF NOT EXISTS "_ProjectOwners_AB_unique" ON "_ProjectOwners"("A", "B")',
      'CREATE INDEX IF NOT EXISTS "_ProjectOwners_B_index" ON "_ProjectOwners"("B")',
    ]);
  });
});
