import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { normalizeDatabaseUrl, parseDatabaseName, splitSqlStatements } = require("../scripts/db-utils");

describe("db-utils", () => {
  it("normalizes localhost to 127.0.0.1 for MySQL URLs", () => {
    expect(normalizeDatabaseUrl("mysql://root:@localhost:3306/ur_platform")).toBe(
      "mysql://root:@127.0.0.1:3306/ur_platform",
    );
  });

  it("parses database name from connection URL", () => {
    expect(parseDatabaseName("mysql://root:@127.0.0.1:3306/ur_platform")).toBe("ur_platform");
  });

  it("splits creator-audience SQL into three MySQL-compatible CREATE TABLE statements", () => {
    const sql = readFileSync(join(process.cwd(), "drizzle/creator-audience-migration.sql"), "utf8");
    expect(sql).not.toMatch(/`[^`]+`\s+timestamp[^,\n]*DEFAULT\s+\(now\(\)\)/i);
    const statements = splitSqlStatements(sql);
    expect(statements).toHaveLength(3);
    expect(statements[0]).toMatch(/CREATE TABLE IF NOT EXISTS `contentCreatorProfiles`/i);
    expect(statements[1]).toMatch(/CREATE TABLE IF NOT EXISTS `creatorChannelFollows`/i);
    expect(statements[2]).toMatch(/CREATE TABLE IF NOT EXISTS `creatorPaidChannelSubs`/i);
    for (const statement of statements) {
      expect(statement).toMatch(/DEFAULT CURRENT_TIMESTAMP/i);
    }
  });
});
