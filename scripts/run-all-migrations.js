#!/usr/bin/env node
"use strict";

const path = require("path");
const { execSync } = require("child_process");
const {
  getDatabaseUrl,
  parseDatabaseName,
  serverUrlWithoutDatabase,
  runSqlFile,
  isConnectionRefused,
  mysql,
} = require("./db-utils");

const SUPPLEMENTAL_MIGRATIONS = [
  { file: "drizzle/ai-chat-sync-migration.sql", label: "ai-chat-sync" },
  { file: "drizzle/coder-sandbox-migration.sql", label: "coder-sandbox" },
  { file: "drizzle/game-sandbox-migration.sql", label: "game-sandbox" },
  { file: "drizzle/schema-additions.sql", label: "schema-additions" },
  { file: "drizzle/content-protection-migration.sql", label: "content-protection" },
  { file: "drizzle/ai-user-memory-migration.sql", label: "ai-user-memory" },
  { file: "drizzle/platform-ops-migration.sql", label: "platform-ops" },
];

async function ensureDatabase() {
  const url = getDatabaseUrl();
  if (!url) {
    console.error("[db] DATABASE_URL is not set in .env");
    process.exit(1);
  }

  const dbName = parseDatabaseName(url);
  const serverUrl = serverUrlWithoutDatabase(url);
  const conn = await mysql.createConnection(serverUrl);
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName.replace(/`/g, "")}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    console.log(`[db] Database ready: ${dbName}`);
  } finally {
    await conn.end();
  }
}

function runDrizzleMigrate() {
  console.log("[db] Running drizzle-kit migrate…");
  execSync("pnpm exec drizzle-kit migrate", {
    stdio: "inherit",
    env: process.env,
    cwd: process.cwd(),
  });
}

async function main() {
  await ensureDatabase();

  const url = getDatabaseUrl();
  if (!url) process.exit(1);

  try {
    runDrizzleMigrate();
  } catch (err) {
    console.warn("[db] drizzle-kit migrate failed (will apply supplemental SQL):", err.message || err);
  }

  const conn = await mysql.createConnection(url);
  try {
    for (const entry of SUPPLEMENTAL_MIGRATIONS) {
      const filePath = path.join(process.cwd(), entry.file);
      await runSqlFile(conn, filePath, entry.label);
    }

    const [tables] = await conn.query("SHOW TABLES");
    console.log(`[db] Migration complete — ${tables.length} tables in database.`);
  } finally {
    await conn.end();
  }
}

main().catch(function (err) {
  if (isConnectionRefused(err)) {
    console.error("[db] MySQL is not running on port 3306.\n");
    console.error("Run: pnpm db:check   for install options");
    console.error("Then: pnpm db:setup   after MySQL is started");
  } else {
    console.error("[db] Migration failed:", err.message || err);
  }
  process.exit(1);
});
