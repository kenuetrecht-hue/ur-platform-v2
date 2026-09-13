#!/usr/bin/env node
"use strict";

/**
 * Railway start: create tables once (idempotent), then serve the website.
 * Uses MYSQL_DATABASE_URL / MYSQL_URL / Railway MYSQL* pieces — never logs the password.
 */
const { execSync, execFileSync } = require("child_process");
const path = require("path");
const { getDatabaseUrl } = require("./db-utils");

if (!getDatabaseUrl()) {
  console.warn("[start] No MySQL URL — starting without creating tables.");
} else {
  execSync(`"${process.execPath}" "${path.join(__dirname, "run-all-migrations.js")}"`, {
    stdio: "inherit",
    env: process.env,
    cwd: process.cwd(),
  });
}

execFileSync(process.execPath, [path.join(process.cwd(), "dist", "index.mjs")], {
  stdio: "inherit",
  env: process.env,
  cwd: process.cwd(),
});
