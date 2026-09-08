#!/usr/bin/env node
"use strict";

const path = require("path");
const { getDatabaseUrl, runSqlFile, isConnectionRefused, mysql } = require("./db-utils");

async function main() {
  const url = getDatabaseUrl();
  if (!url) {
    console.error("[creator-audience] DATABASE_URL is not set in .env");
    process.exit(1);
  }

  const sqlPath = path.join(process.cwd(), "drizzle", "creator-audience-migration.sql");
  const conn = await mysql.createConnection(url);
  try {
    await runSqlFile(conn, sqlPath, "creator-audience");
    const [rows] = await conn.query("SHOW TABLES");
    const names = rows
      .map(function (row) {
        return String(Object.values(row)[0] || "").toLowerCase();
      })
      .filter(function (name) {
        return (
          name === "contentcreatorprofiles" ||
          name === "creatorchannelfollows" ||
          name === "creatorpaidchannelsubs"
        );
      });
    console.log("[creator-audience] Tables present:", names.join(", "));
    if (names.length < 3) {
      throw new Error("Expected contentCreatorProfiles, creatorChannelFollows, and creatorPaidChannelSubs");
    }
    console.log("[creator-audience] Done.");
  } finally {
    await conn.end();
  }
}

main().catch(function (err) {
  if (isConnectionRefused(err)) {
    console.error("[creator-audience] MySQL is not running. Run: pnpm db:mysql:up  then  pnpm db:setup");
  } else {
    console.error("[creator-audience] Failed:", err.message || err);
  }
  process.exit(1);
});
