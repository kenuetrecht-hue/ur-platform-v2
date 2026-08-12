"use strict";

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

require("dotenv").config({ path: path.join(process.cwd(), ".env") });

/** Prefer IPv4 on Windows — localhost often resolves to ::1 while MySQL listens on 127.0.0.1. */
function normalizeDatabaseUrl(url) {
  return url.replace(/@localhost(?=[:/])/g, "@127.0.0.1");
}

function getDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return null;
  if (!raw.startsWith("mysql://") && !raw.startsWith("mysql2://")) {
    throw new Error(
      "DATABASE_URL must be mysql://… (this project uses drizzle-orm/mysql2, not PostgreSQL).",
    );
  }
  return normalizeDatabaseUrl(raw);
}

function parseDatabaseName(url) {
  const withoutQuery = url.split("?")[0];
  const segment = withoutQuery.split("/").pop() || "";
  return decodeURIComponent(segment);
}

function serverUrlWithoutDatabase(url) {
  const withoutQuery = url.split("?")[0];
  const idx = withoutQuery.lastIndexOf("/");
  if (idx === -1) return withoutQuery;
  return withoutQuery.slice(0, idx);
}

function splitSqlStatements(sql) {
  return sql
    .split(";")
    .map(function (s) {
      return s.trim();
    })
    .filter(function (s) {
      return s.length > 0 && !s.startsWith("--");
    });
}

async function runSqlFile(conn, filePath, label) {
  const sql = fs.readFileSync(filePath, "utf8");
  const statements = splitSqlStatements(sql);
  for (const statement of statements) {
    await conn.query(statement);
    const preview = (statement.split("\n")[0] || statement).slice(0, 72);
    console.log(`[db] ${label}: ${preview}`);
  }
}

function isConnectionRefused(error) {
  const message = error && error.message ? error.message : String(error);
  if (message.includes("ECONNREFUSED")) return true;
  if (error && error.code === "ECONNREFUSED") return true;
  if (error && Array.isArray(error.errors)) {
    return error.errors.some(function (e) {
      return e && e.code === "ECONNREFUSED";
    });
  }
  return false;
}

module.exports = {
  normalizeDatabaseUrl,
  getDatabaseUrl,
  parseDatabaseName,
  serverUrlWithoutDatabase,
  splitSqlStatements,
  runSqlFile,
  isConnectionRefused,
  mysql,
};
