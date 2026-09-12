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
  const named = [
    process.env.MYSQL_DATABASE_URL,
    process.env.TIDB_DATABASE_URL,
    process.env.MYSQL_URL,
    process.env.DATABASE_URL,
  ];
  for (let i = 0; i < named.length; i += 1) {
    const raw = (named[i] || "").trim();
    if (raw.startsWith("mysql://") || raw.startsWith("mysql2://")) {
      return normalizeDatabaseUrl(raw);
    }
  }
  const host = (process.env.MYSQLHOST || "").trim();
  const user = (process.env.MYSQLUSER || "").trim();
  const database = (process.env.MYSQLDATABASE || "").trim();
  const password = process.env.MYSQLPASSWORD || "";
  const port = (process.env.MYSQLPORT || "").trim() || "3306";
  if (host && user && database) {
    return normalizeDatabaseUrl(
      "mysql://" +
        encodeURIComponent(user) +
        ":" +
        encodeURIComponent(password) +
        "@" +
        host +
        ":" +
        port +
        "/" +
        encodeURIComponent(database),
    );
  }
  const raw = (process.env.DATABASE_URL || "").trim();
  if (raw.startsWith("postgres://") || raw.startsWith("postgresql://")) {
    throw new Error(
      "DATABASE_URL is Postgres. Set MYSQL_DATABASE_URL to a mysql://… string, or add a Railway MySQL database.",
    );
  }
  if (raw) {
    throw new Error(
      "DATABASE_URL must be mysql://… (this project uses drizzle-orm/mysql2, not PostgreSQL).",
    );
  }
  return null;
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

function stripLeadingSqlComments(chunk) {
  return chunk
    .split("\n")
    .filter(function (line) {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith("--");
    })
    .join("\n")
    .trim();
}

function splitSqlStatements(sql) {
  return sql
    .split(";")
    .map(function (s) {
      return stripLeadingSqlComments(s.trim());
    })
    .filter(function (s) {
      return s.length > 0;
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
