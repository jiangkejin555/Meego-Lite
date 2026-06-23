import { describe, expect, test } from "bun:test";
import {
  ensureProjectSchema,
  ensureTaskSchema,
  ensureUserSchema,
} from "./db-migrations";

type QueryRow = { name: string };

function createFakeDb({
  columns = [],
  tables = [],
  tableColumnsMap,
}: {
  columns?: QueryRow[];
  tables?: QueryRow[];
  tableColumnsMap?: Record<string, QueryRow[]>;
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
        if (tableColumnsMap) {
          const match = sql.match(/PRAGMA table_info\('(.+)'\)/);
          if (match) {
            return (tableColumnsMap[match[1]] ?? []) as T;
          }
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
      tables: [{ name: "User" }],
      columns: [{ name: "id" }, { name: "name" }, { name: "email" }],
    });

    await ensureUserSchema(db);

    expect(statements).toContain(
      'ALTER TABLE "User" ADD COLUMN "deletedAt" DATETIME'
    );
    expect(statements).toContain(
      'ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT'
    );
    expect(statements).toContain(
      'ALTER TABLE "User" ADD COLUMN "leadTimeMinutes" INTEGER NOT NULL DEFAULT 60'
    );
  });

  test("User 表已有所有字段时不重复补列", async () => {
    const { db, statements } = createFakeDb({
      tables: [{ name: "User" }],
      columns: [
        { name: "id" },
        { name: "deletedAt" },
        { name: "passwordHash" },
        { name: "feishuId" },
        { name: "wecomId" },
        { name: "notifyEmail" },
        { name: "notifyFeishu" },
        { name: "notifyWeCom" },
        { name: "feishuWebhook" },
        { name: "wecomWebhook" },
        { name: "leadTimeMinutes" },
      ],
    });

    await ensureUserSchema(db);

    expect(
      statements.filter((s) => s.startsWith('ALTER TABLE "User"'))
    ).toEqual([]);
  });

  test("Task 表缺少新字段时自动补列", async () => {
    const { db, statements } = createFakeDb({
      tables: [{ name: "Task" }],
      columns: [{ name: "id" }, { name: "title" }],
    });

    await ensureTaskSchema(db);

    expect(statements).toContain(
      'ALTER TABLE "Task" ADD COLUMN "projectId" TEXT'
    );
    expect(statements).toContain('ALTER TABLE "Task" ADD COLUMN "tags" TEXT');
    expect(statements).toContain(
      'ALTER TABLE "Task" ADD COLUMN "estimatedHours" REAL'
    );
    expect(statements).toContain(
      'ALTER TABLE "Task" ADD COLUMN "actualHours" REAL'
    );
  });

  test("旧库缺少 Project 相关结构时自动创建表和 _ProjectOwners", async () => {
    const { db, statements } = createFakeDb({
      tables: [],
      columns: [{ name: "id" }, { name: "title" }],
    });

    await ensureProjectSchema(db);

    expect(statements[0]).toBe(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Project'"
    );
    expect(statements.some((s) => s.includes('CREATE TABLE "Project"'))).toBe(
      true
    );
    expect(
      statements.some((s) => s.includes('CREATE TABLE "_ProjectOwners"'))
    ).toBe(true);
    expect(statements).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "_ProjectOwners_AB_unique" ON "_ProjectOwners"("A", "B")'
    );
    expect(statements).toContain(
      'CREATE INDEX IF NOT EXISTS "_ProjectOwners_B_index" ON "_ProjectOwners"("B")'
    );
  });
});
