#!/usr/bin/env node
"use strict";

const {
  getDatabaseUrl,
  parseDatabaseName,
  serverUrlWithoutDatabase,
  isConnectionRefused,
  mysql,
} = require("./db-utils");

async function main() {
  const url = getDatabaseUrl();
  if (!url) {
    console.error("[db] DATABASE_URL is not set in .env");
    process.exit(1);
  }

  const dbName = parseDatabaseName(url);
  if (!dbName) {
    console.error("[db] DATABASE_URL must include a database name, e.g. mysql://root:@127.0.0.1:3306/ur_platform");
    process.exit(1);
  }

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

main().catch(function (err) {
  if (isConnectionRefused(err)) {
    console.error(
      "[db] MySQL is not running. Start it with one of:\n" +
        "  • pnpm db:mysql:up   (Docker — recommended)\n" +
        "  • Start MySQL/MariaDB service on port 3306\n" +
        "Then run: pnpm db:setup",
    );
  } else {
    console.error("[db] ensure-mysql-database failed:", err.message || err);
  }
  process.exit(1);
});
