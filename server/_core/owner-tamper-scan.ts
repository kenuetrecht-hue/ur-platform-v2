/**
 * Reads the website source (or the built copy) and looks for planted doors.
 * Does not read secrets, .env, or installed packages.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { scanSourceForTamper, type TamperHit, type TamperScanFile } from "../../lib/owner-tamper-scan";

const SOURCE_DIRS = ["server", "app", "components", "lib"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const MAX_FILES = 4000;
const MAX_BYTES = 400_000;

function walk(dir: string, out: string[]): void {
  if (out.length >= MAX_FILES) return;
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (out.length >= MAX_FILES) return;
    if (name === "node_modules" || name === "__tests__" || name === "dist-web" || name.startsWith(".")) {
      continue;
    }
    const full = path.join(dir, name);
    let info: ReturnType<typeof statSync>;
    try {
      info = statSync(full);
    } catch {
      continue;
    }
    if (info.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!EXTENSIONS.has(path.extname(name))) continue;
    if (name.endsWith(".test.ts") || name.endsWith(".test.tsx")) continue;
    if (info.size > MAX_BYTES) continue;
    out.push(full);
  }
}

export type CodeTamperScan = {
  where: "source" | "dist" | "none";
  filesChecked: number;
  hits: TamperHit[];
};

export function runOwnerCodeTamperScan(root = process.cwd()): CodeTamperScan {
  const paths: string[] = [];
  const hasSource = SOURCE_DIRS.some((dir) => existsSync(path.join(root, dir)));
  if (hasSource) {
    for (const dir of SOURCE_DIRS) {
      const abs = path.join(root, dir);
      if (existsSync(abs)) walk(abs, paths);
    }
  }
  let where: CodeTamperScan["where"] = paths.length > 0 ? "source" : "none";
  if (paths.length === 0 && existsSync(path.join(root, "dist"))) {
    walk(path.join(root, "dist"), paths);
    where = paths.length > 0 ? "dist" : "none";
  }

  const files: TamperScanFile[] = [];
  for (const filePath of paths) {
    try {
      files.push({
        path: path.relative(root, filePath),
        text: readFileSync(filePath, "utf8"),
      });
    } catch {
      /* unreadable file is skipped, not treated as a planted door */
    }
  }
  return { where, filesChecked: files.length, hits: scanSourceForTamper(files) };
}
