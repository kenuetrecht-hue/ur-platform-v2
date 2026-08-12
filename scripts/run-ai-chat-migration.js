#!/usr/bin/env node
"use strict";

/**
 * Applies drizzle/ai-chat-sync-migration.sql using DATABASE_URL from .env
 * Prefer: pnpm db:setup (runs all migrations including this one)
 */
const path = require("path");
const { getDatabaseUrl, runSqlFile, isConnectionRefused, mysql } = require("./db-utils");

async function main() {
  const url = getDatabaseUrl();
  if (!url) {
    console.error("[ai-chat-migration] DATABASE_URL is not set in .env");
    process.exit(1);
  }

  const sqlPath = path.join(process.cwd(), "drizzle", "ai-chat-sync-migration.sql");
  const conn = await mysql.createConnection(url);
  try {
    await runSqlFile(conn, sqlPath, "ai-chat-sync");
    const [rows] = await conn.query("SHOW TABLES LIKE 'aiChat%'");
    console.log("[ai-chat-migration] Tables:", rows);
    console.log("[ai-chat-migration] Done.");
  } finally {
    await conn.end();
  }
}

main().catch(function (err) {
  if (isConnectionRefused(err)) {
    console.error(
      "[ai-chat-migration] MySQL is not running. Run: pnpm db:mysql:up  then  pnpm db:setup",
    );
  } else {
    console.error("[ai-chat-migration] Failed:", err.message || err);
  }
  process.exit(1);
});
