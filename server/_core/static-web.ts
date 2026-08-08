/**
 * Serves the Expo static web export from the same Express host as the API.
 * Production: run `pnpm build:web` then `pnpm start` — one URL for app + API.
 */

import express from "express";
import fs from "fs";
import path from "path";

const DEFAULT_DIST = path.join(process.cwd(), "dist");

export function resolveWebDistPath(): string {
  return process.env.WEB_DIST_PATH?.trim() || DEFAULT_DIST;
}

export function hasStaticWebBuild(distPath = resolveWebDistPath()): boolean {
  return fs.existsSync(path.join(distPath, "index.html"));
}

export function registerStaticWeb(app: express.Application): boolean {
  const distPath = resolveWebDistPath();
  if (!hasStaticWebBuild(distPath)) {
    return false;
  }

  app.use(
    express.static(distPath, {
      index: false,
      maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
    }),
  );

  // SPA fallback — client routes (Expo Router) not served as static files
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    res.sendFile(path.join(distPath, "index.html"));
  });

  console.log(`[web] Static app served from ${distPath}`);
  return true;
}
