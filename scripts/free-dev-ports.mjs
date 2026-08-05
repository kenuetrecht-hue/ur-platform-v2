#!/usr/bin/env node
/**
 * Free dev ports before pnpm dev (Windows-friendly).
 * Stops processes listening on Metro (8082) and API (3000).
 */
import { execSync } from "child_process";

const PORTS = [8082, 8083, 8084, 8085, 3000, 3001, 3002, 3003, 3004, 3005];

function freePortWindows(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split("\n")) {
      if (!line.includes("LISTENING")) continue;
      const pid = line.trim().split(/\s+/).pop();
      if (pid && pid !== "0" && pid !== String(process.pid)) {
        pids.add(pid);
      }
    }
    for (const pid of pids) {
      console.log(`[free-dev-ports] Stopping PID ${pid} on port ${port}`);
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* nothing listening */
  }
}

console.log("[free-dev-ports] Clearing dev ports…");
for (const port of PORTS) {
  if (process.platform === "win32") {
    freePortWindows(port);
  }
}
console.log("[free-dev-ports] Done.");
