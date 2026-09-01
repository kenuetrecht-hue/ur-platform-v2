import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import dns from "dns/promises";
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
import { getMuxEnginePublicStatus } from "./mux-video-engine";
import { logSocialPublisherStartup } from "./social-publisher-service";
import { registerMuxWebhook } from "./mux-webhook";
import { getAiHealthStatus, logGeminiStartupCheck } from "./google-ai";
import { startForgeSessionJanitor } from "./forge-session-manager";
import { getSharePreview } from "./forge-share-service";
import { isSupabaseConfiguredOnServer, isSupabaseAuthReachable } from "../supabase-auth";
import { resolveSupabasePublicConfig } from "../../shared/supabase-config";
import * as db from "../db";
import { registerStaticWeb } from "./static-web";
import { getCommerceMode, isSimulatedCommerceMode, DEV_SIMULATED_COMMERCE_NOTICE } from "../../lib/dev-commerce-mode";
import { isDevAgeKycBypassEnabled } from "../../lib/dev-age-kyc-mode";
import { hydrateContentProtectionFromDatabase } from "./creator-content-protection-service";
import { hydrateRecentAiUserMemory } from "./ai-user-memory-persistence";
import { startPlatformOpsMonitor } from "./platform-ops-monitor";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canBindPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => resolve(false));
    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port);
  });
}

async function waitForPort(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await canBindPort(port)) return true;
    await delay(200);
  }
  return false;
}

/** Windows + tsx watch: wait until the old process releases :3000, then bind once. */
async function listenOnPort(
  httpServer: ReturnType<typeof createServer>,
  port: number,
): Promise<void> {
  if (!ENV.isProduction) {
    const ready = await waitForPort(port, 8_000);
    if (!ready) {
      const error = new Error(`Port ${port} in use`) as NodeJS.ErrnoException;
      error.code = "EADDRINUSE";
      throw error;
    }
    await delay(50);
  }

  await new Promise<void>((resolve, reject) => {
    const onError = (error: NodeJS.ErrnoException) => {
      httpServer.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      httpServer.off("error", onError);
      resolve();
    };
    httpServer.once("error", onError);
    httpServer.once("listening", onListening);
    httpServer.listen(port);
  });
}

async function startServer() {
  assertServerSecretsSafe();
  assertProductionOwnerSecurity();

  const app = express();
  const server = createServer(app);

  try {
    const { registerAiChatRealtimeWs } = await import("./ai-chat-realtime-ws");
    registerAiChatRealtimeWs(server);
  } catch (error) {
    console.warn(
      "[ai-chat-realtime] WebSocket disabled — install dependencies: stop pnpm dev, run pnpm install, restart.",
      error instanceof Error ? error.message : error,
    );
  }

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(securityHeadersMiddleware);
  app.use(strictCorsMiddleware);

  registerMuxWebhook(app);

  // JSON body limit — large uploads should use dedicated storage routes
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  app.use("/api", apiIpGuardMiddleware);

  app.get("/robots.txt", (_req, res) => {
    res
      .type("text/plain")
      .setHeader("Cache-Control", "public, max-age=86400")
      .send(
        [
          "User-agent: *",
          "Allow: /",
          "Disallow: /api/",
          "Disallow: /age-verify",
          "Disallow: /login",
          "Disallow: /signup",
          "",
        ].join("\n"),
      );
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/health", async (_req, res) => {
    const ai = await getAiHealthStatus();
    const supabaseReachable = await isSupabaseAuthReachable();
    res.json({
      ok: true,
      timestamp: Date.now(),
      auth: {
        supabaseConfigured: isSupabaseConfiguredOnServer(),
        supabaseReachable,
        hint: supabaseReachable
          ? undefined
          : "Supabase URL does not resolve. Create a project at supabase.com/dashboard and update EXPO_PUBLIC_SUPABASE_URL.",
      },
      commerce: {
        mode: getCommerceMode(),
        simulated: isSimulatedCommerceMode(),
        notice: isSimulatedCommerceMode() ? DEV_SIMULATED_COMMERCE_NOTICE : undefined,
      },
      ai: {
        configured: ai.configured,
        reachable: ai.reachable,
        model: ai.model,
        hint: ai.hint,
      },
      video: getMuxEnginePublicStatus(),
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

  registerStaticWeb(app);

  const preferredPort = parseInt(process.env.PORT || "3000", 10);
  try {
    await listenOnPort(server, preferredPort);
  } catch (error) {
    const busy = error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "EADDRINUSE";
    if (!ENV.isProduction && busy) {
      console.error(
        `[api] FATAL: Port ${preferredPort} is still in use after waiting. ` +
          `Stop the other API, then run: node scripts/free-dev-ports.mjs && pnpm dev:web`,
      );
      process.exit(1);
    }
    throw error;
  }

  const port = preferredPort;
  console.log(`[api] server listening on port ${port}`);
  startForgeSessionJanitor();
  void hydrateContentProtectionFromDatabase();
  void hydrateRecentAiUserMemory();
  startPlatformOpsMonitor();
  console.log(
    `[env] Platform owner: ${isOwnerEmailConfigured() ? "configured" : "MISSING — set PLATFORM_OWNER_EMAIL in .env"}`,
  );
  const supa = resolveSupabasePublicConfig();
  console.log(
    `[auth] Supabase: ${isSupabaseConfiguredOnServer() ? "configured" : "MISSING"} (${supa.url})`,
  );
  if (isDevAgeKycBypassEnabled()) {
    console.log(
      "[auth] Age KYC: development bypass — ID upload skipped. Set DEV_SKIP_AGE_KYC=false to test the real 18+ check.",
    );
  }
  void (async function checkSupabaseHost() {
    try {
      const host = new URL(supa.url).hostname;
      await dns.lookup(host);
    } catch {
      console.warn(
        `[auth] Supabase host does not resolve (${supa.url}). ` +
          "Create a project at https://supabase.com/dashboard and update EXPO_PUBLIC_SUPABASE_URL in .env.",
      );
    }
  })();
  void db.getDb().then((conn) => {
    const dbUrl = process.env.DATABASE_URL ?? "";
    if (!dbUrl) {
      console.warn("[Database] DATABASE_URL not set — loyalty/user data will not persist");
    } else if (!conn) {
      console.warn(
        "[Database] Not connected — run pnpm db:mysql-dev then pnpm db:setup",
      );
    } else {
      console.log("[Database] MySQL connected — user/loyalty persistence enabled");
    }
  });
  void logGeminiStartupCheck();
  const mux = getMuxEnginePublicStatus();
  console.log(
    `[video] Primary engine: Mux — ${mux.configured ? "configured" : "not configured (add MUX_TOKEN_ID + MUX_TOKEN_SECRET)"}`,
  );
  logSocialPublisherStartup();
}

startServer().catch(console.error);
