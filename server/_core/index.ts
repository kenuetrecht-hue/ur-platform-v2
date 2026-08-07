import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import {
  apiIpGuardMiddleware,
  securityHeadersMiddleware,
  strictCorsMiddleware,
} from "./api-security";
import { ENV, isOwnerEmailConfigured, assertProductionOwnerSecurity } from "./env";
import { assertServerSecretsSafe, redactSecrets } from "./secrets";
import { getAiHealthStatus, logGeminiStartupCheck } from "./google-ai";
import { startForgeSessionJanitor } from "./forge-session-manager";
import { getSharePreview } from "./forge-share-service";
import { isSupabaseConfiguredOnServer } from "../supabase-auth";
import { resolveSupabasePublicConfig } from "../../shared/supabase-config";
import * as db from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  assertServerSecretsSafe();
  assertProductionOwnerSecurity();

  const app = express();
  const server = createServer(app);

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(securityHeadersMiddleware);
  app.use(strictCorsMiddleware);

  // JSON body limit — large uploads should use dedicated storage routes
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  app.use("/api", apiIpGuardMiddleware);

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/health", async (_req, res) => {
    const ai = await getAiHealthStatus();
    res.json({
      ok: true,
      timestamp: Date.now(),
      ai: {
        configured: ai.configured,
        reachable: ai.reachable,
        model: ai.model,
        hint: ai.hint,
      },
    });
  });

  app.get("/api/forge/share/:token", (req, res) => {
    const preview = getSharePreview(req.params.token);
    if (!preview) {
      res.status(410).send("Share link expired or not found.");
      return;
    }
    if (preview.preview.html) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.send(preview.preview.html);
      return;
    }
    res.json({
      projectName: preview.projectName,
      preview: preview.preview,
      expiresAt: preview.expiresAt,
      readOnly: true,
    });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, path, type, ctx }) {
        if (ENV.isProduction) {
          console.error(`[trpc] ${type} ${path ?? "unknown"}`, {
            code: error.code,
            requestId: ctx?.requestId,
            ip: ctx?.ip,
          });
        } else {
          console.error(
            `[trpc] ${type} ${path ?? "unknown"}`,
            redactSecrets(String(error.message ?? error)),
          );
        }
      },
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        `[api] FATAL: Port ${preferredPort} is already in use. ` +
          `The app expects EXPO_PUBLIC_API_BASE_URL on :${preferredPort}. ` +
          `Run: node scripts/free-dev-ports.mjs  then  pnpm dev`,
      );
      process.exit(1);
    }
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
    startForgeSessionJanitor();
    console.log(
      `[env] Platform owner: ${isOwnerEmailConfigured() ? "configured" : "MISSING — set PLATFORM_OWNER_EMAIL in .env"}`,
    );
    const supa = resolveSupabasePublicConfig();
    console.log(
      `[auth] Supabase: ${isSupabaseConfiguredOnServer() ? "configured" : "MISSING"} (${supa.url})`,
    );
    void db.getDb().then((conn) => {
      const dbUrl = process.env.DATABASE_URL ?? "";
      if (!dbUrl) {
        console.warn("[Database] DATABASE_URL not set — loyalty/user data will not persist");
      } else if (!conn) {
        console.warn(
          "[Database] Not connected — start MySQL and run pnpm db:push. " +
            "Use mysql:// not postgresql:// in DATABASE_URL",
        );
      } else {
        console.log("[Database] MySQL connected — user/loyalty persistence enabled");
      }
    });
    if (port !== preferredPort) {
      console.warn(
        `[api] WARNING: App expects port ${preferredPort} (EXPO_PUBLIC_API_BASE_URL). Free port ${preferredPort} or update .env to :${port}`,
      );
    }
    void logGeminiStartupCheck();
  });
}

startServer().catch(console.error);
