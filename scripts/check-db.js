#!/usr/bin/env node
"use strict";

/**
 * Checks DATABASE_URL and MySQL connectivity; prints Windows-friendly next steps.
 */
const {
  getDatabaseUrl,
  parseDatabaseName,
  isConnectionRefused,
  mysql,
} = require("./db-utils");

async function main() {
  const url = getDatabaseUrl();
  if (!url) {
    console.error("[db:check] DATABASE_URL is missing from .env");
    console.error("[db:check] Add: DATABASE_URL=\"mysql://root:@127.0.0.1:3306/ur_platform\"");
    process.exit(1);
  }

  const dbName = parseDatabaseName(url);
  console.log("[db:check] DATABASE_URL:", url.replace(/:[^:@/]+@/, ":***@"));
  console.log("[db:check] Database name:", dbName);

  try {
    const conn = await mysql.createConnection(url);
    await conn.query("SELECT 1");
    const [tables] = await conn.query("SHOW TABLES");
    await conn.end();
    console.log("[db:check] MySQL is running.");
    console.log(`[db:check] ${tables.length} tables found.`);
    if (tables.length === 0) {
      console.log("[db:check] Run: pnpm db:setup");
    } else {
      console.log("[db:check] Ready — restart pnpm dev if the API was already running.");
    }
    process.exit(0);
  } catch (err) {
    if (!isConnectionRefused(err)) {
      console.error("[db:check] Error:", err.message || err);
      process.exit(1);
    }

    console.error("[db:check] MySQL is NOT running on port 3306.\n");
    console.error("Install and start MySQL, then run: pnpm db:setup\n");
    console.error("--- Option A: Docker Desktop (recommended) ---");
    console.error("  1. Install Docker Desktop: https://www.docker.com/products/docker-desktop/");
    console.error("  2. pnpm db:mysql:up");
    console.error("  3. pnpm db:setup\n");
    console.error("--- Option B: MySQL Installer (Windows) ---");
    console.error("  1. Download: https://dev.mysql.com/downloads/installer/");
    console.error("  2. Choose \"MySQL Server\" + \"MySQL Workbench\" (optional)");
    console.error("  3. Set root password to empty OR update DATABASE_URL in .env");
    console.error("  4. Start \"MySQL80\" service in services.msc");
    console.error("  5. pnpm db:setup\n");
    console.error("--- Option C: XAMPP ---");
    console.error("  1. Install XAMPP: https://www.apachefriends.org/");
    console.error("  2. Open XAMPP Control Panel → Start MySQL");
    console.error("  3. pnpm db:setup\n");
    console.error("--- Option D: winget (PowerShell as admin) ---");
    console.error("  winget install Oracle.MySQL --accept-source-agreements --accept-package-agreements");
    console.error("  Then start the MySQL80 service and run: pnpm db:setup");
    process.exit(1);
  }
}

main();
