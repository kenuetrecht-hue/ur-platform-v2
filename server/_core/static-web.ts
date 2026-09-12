/**
 * Serves the Expo static web export from the same Express host as the API.
 * Production: run `pnpm build` then `pnpm build:web` — one URL for app + API.
 */

import express from "express";
import fs from "fs";
import path from "path";
import {
  TERMS_BUSINESS_ADDRESS,
  TERMS_SUPPORT_EMAIL,
  TERMS_SUPPORT_PHONE,
} from "../../lib/platform-terms-of-use";

const DIST = path.join(process.cwd(), "dist");
const DIST_WEB = path.join(process.cwd(), "dist-web");

export function resolveWebDistPath(): string {
  const fromEnv = process.env.WEB_DIST_PATH?.trim();
  if (fromEnv) return fromEnv;
  if (fs.existsSync(path.join(DIST_WEB, "index.html"))) return DIST_WEB;
  return DIST;
}

export function hasStaticWebBuild(distPath = resolveWebDistPath()): boolean {
  return fs.existsSync(path.join(distPath, "index.html"));
}

const PWA_INSTALL_FILES = ["manifest.webmanifest", "sw.js"] as const;

/** Home-screen wrap files — never fall through to the HTML app shell. */
export function registerPwaInstallFiles(app: express.Application): void {
  const distPath = resolveWebDistPath();
  const publicDir = path.join(process.cwd(), "public");
  for (const file of PWA_INSTALL_FILES) {
    app.get(`/${file}`, (_req, res, next) => {
      const target = [path.join(distPath, file), path.join(publicDir, file)].find((candidate) =>
        fs.existsSync(candidate),
      );
      if (!target) {
        next();
        return;
      }
      if (file.endsWith(".webmanifest")) {
        res.type("application/manifest+json");
      }
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.resolve(target));
    });
  }
}

export function registerStaticWeb(app: express.Application): boolean {
  registerPwaInstallFiles(app);
  const distPath = resolveWebDistPath();
  if (!hasStaticWebBuild(distPath)) {
    console.warn(
      "[web] No website export found. Railway needs `pnpm build:web` (dist-web/index.html).",
    );
    registerPublicSiteFallback(app);
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

/** Shown only when the Expo web export is missing so the live URL is not a blank 404. */
export function registerPublicSiteFallback(app: express.Application): void {
  app.get("/", (_req, res) => {
    res
      .status(200)
      .type("html")
      .send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>UR Platform</title>
</head>
<body style="font-family:system-ui,sans-serif;background:#07080d;color:#f4f4f5;margin:0;padding:2rem;max-width:40rem">
  <h1>UR Platform</h1>
  <p>The site host is up. The full website export is not on this server yet.</p>
  <p>Email: ${TERMS_SUPPORT_EMAIL}<br />Phone: ${TERMS_SUPPORT_PHONE}<br />${TERMS_BUSINESS_ADDRESS}</p>
</body>
</html>`);
  });
}
