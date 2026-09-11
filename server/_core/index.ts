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
import { registerStripeWebhook } from "./stripe-webhook";
import { getAiHealthStatus, logGeminiStartupCheck } from "./google-ai";
import { startForgeSessionJanitor } from "./forge-session-manager";
import { getSharePreview } from "./forge-share-service";
import { isSupabaseConfiguredOnServer, isSupabaseAuthReachable } from "../supabase-auth";
import { resolveSupabasePublicConfig, supabaseUnreachableHint } from "../../shared/supabase-config";
import * as db from "../db";
import { registerStaticWeb } from "./static-web";
import {
  getCommerceMode,
  isSimulatedCommerceMode,
  isStripeLiveCheckoutReady,
  DEV_SIMULATED_COMMERCE_NOTICE,
  LIVE_CHECKOUT_UNAVAILABLE_NOTICE,
} from "../../lib/dev-commerce-mode";
import { isDevAgeKycBypassEnabled } from "../../lib/dev-age-kyc-mode";
import { hydrateContentProtectionFromDatabase } from "./creator-content-protection-service";
import { hydrateCreatorRosterFromDatabase } from "./partner-program-service";
import { hydrateRecentAiUserMemory } from "./ai-user-memory-persistence";
import { startPlatformOpsMonitor } from "./platform-ops-monitor";
import { startAiFreeBoardPublisher } from "./ai-free-board-service";
import { isPayloadTooLargeError, jsonBodyLimitForPath } from "./json-body-limit";
import { registerAgeKycFastRoute } from "./age-kyc-fast-route";
import { gzipResponseMiddleware } from "./gzip-response";

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
    tester.listen(port, "0.0.0.0");
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
    httpServer.listen(port, "0.0.0.0");
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
  app.use(gzipResponseMiddleware);

  registerMuxWebhook(app);
  registerStripeWebhook(app);

  // JSON body limit — 1mb everywhere except the ID photo check (three pictures).
  app.use((req, res, next) => {
    const path = `${req.originalUrl ?? ""} ${req.url ?? ""}`;
    express.json({ limit: jsonBodyLimitForPath(path) })(req, res, next);
  });
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
  registerAgeKycFastRoute(app);

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

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
          : supabaseUnreachableHint(),
      },
      commerce: {
        mode: getCommerceMode(),
        simulated: isSimulatedCommerceMode(),
        stripeLiveReady: isStripeLiveCheckoutReady(),
        notice: isSimulatedCommerceMode()
          ? DEV_SIMULATED_COMMERCE_NOTICE
          : isStripeLiveCheckoutReady()
            ? undefined
            : LIVE_CHECKOUT_UNAVAILABLE_NOTICE,
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

  app.use((
    err: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (isPayloadTooLargeError(err)) {
      res.status(413).json({
        error: {
          message: "Those pictures are too large. Take them again and tap Check my three pictures.",
        },
      });
      return;
    }
    next(err);
  });

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
  void hydrateCreatorRosterFromDatabase();
  void hydrateRecentAiUserMemory();
  startPlatformOpsMonitor();
  startAiFreeBoardPublisher();
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
          supabaseUnreachableHint(),
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

startServer().catch((error) => {
  console.error("[api] FATAL: server failed to start", error);
  process.exit(1);
});
