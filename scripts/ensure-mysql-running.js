#!/usr/bin/env node
"use strict";

const net = require("net");
const { execSync } = require("child_process");
const path = require("path");

function portOpen(port, host) {
  return new Promise(function (resolve) {
    const socket = net.createConnection(port, host);
    socket.setTimeout(2000);
    socket.on("connect", function () {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", function () {
      resolve(false);
    });
    socket.on("timeout", function () {
      socket.destroy();
      resolve(false);
    });
  });
}

async function main() {
  if (await portOpen(3306, "127.0.0.1")) {
    return;
  }

  if (process.platform === "win32") {
    const script = path.join(process.cwd(), "scripts", "start-mysql-dev.ps1");
    console.log("[predev] MySQL not running — starting local MySQL…");
    try {
      execSync(`powershell -ExecutionPolicy Bypass -File "${script}"`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch {
      console.warn("[predev] Could not start MySQL. Run: pnpm db:mysql-dev");
    }
    return;
  }

  console.warn("[predev] MySQL is not running on port 3306. Start it before dev.");
}

main();
