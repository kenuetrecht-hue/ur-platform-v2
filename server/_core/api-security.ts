import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

/** Isolated API namespaces — each has its own rate limit bucket and circuit breaker. */
export type ApiNamespace =
  | "chat"
  | "aiLanguage"
  | "aiCreators"
  | "hiveTownHall"
  | "webSearch"
  | "ai"
  | "loyalty"
  | "voiceProperty"
  | "ai3dSpecialist"
  | "aiRealEstate"
  | "stamps"
  | "auth"
  | "system"
  | "platformOps"
  | "equipment"
  | "aiLearning"
  | "dailyEngagement"
  | "coderSandbox"
  | "gameDevSandbox"
  | "forgeAgent"
  | "social"
  | "commerce"
  | "blueprintReader"
  | "aiSubscription"
  | "aiTalk"
  | "landing"
  | "workspace3d"
  | "usageCredits"
  | "jobsite"
  | "video"
  | "default";

type WindowBucket = {
  count: number;
  windowStartMs: number;
};

type CircuitState = {
  failures: number;
  windowStartMs: number;
  openUntilMs: number;
  isOpen: boolean;
};

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/** Per-namespace hourly limits per authenticated user */
const NAMESPACE_USER_LIMITS: Record<ApiNamespace, number> = {
  chat: 120,
  aiLanguage: 150,
  aiCreators: 180,
  hiveTownHall: 24,
  webSearch: 60,
  ai: 200,
  loyalty: 30,
  voiceProperty: 80,
  ai3dSpecialist: 80,
  aiRealEstate: 80,
  stamps: 40,
  auth: 20,
  system: 100,
  platformOps: 120,
  equipment: 100,
  aiLearning: 120,
  dailyEngagement: 60,
  coderSandbox: 120,
  gameDevSandbox: 120,
  forgeAgent: 60,
  social: 90,
  commerce: 80,
  blueprintReader: 90,
  aiSubscription: 40,
  aiTalk: 40,
  landing: 20,
  workspace3d: 40,
  usageCredits: 40,
  jobsite: 80,
  video: 300,
  default: 500,
};

/** Per-namespace circuit breaker — isolates failures to one API surface */
const CIRCUIT_FAILURE_THRESHOLD = 8;
const CIRCUIT_WINDOW_MS = 60_000;
const CIRCUIT_OPEN_MS = 30_000;

const userNamespaceBuckets = new Map<string, WindowBucket>();
const ipNamespaceBuckets = new Map<string, WindowBucket>();
const globalIpBuckets = new Map<string, WindowBucket>();
const circuitBreakers = new Map<ApiNamespace, CircuitState>();
const blockedIps = new Set<string>();

const GLOBAL_IP_LIMIT_PER_MINUTE = 200;

/** Per-namespace IP limits (requests / minute). Auth and landing stay tight against bots. */
const NAMESPACE_IP_LIMITS_PER_MINUTE: Partial<Record<ApiNamespace, number>> = {
  auth: 20,
  landing: 30,
  social: 80,
  commerce: 20,
  video: 20,
};
const DEFAULT_IP_LIMIT_PER_MINUTE = 180;

function parseAllowedOrigins(): Set<string> {
  const origins = new Set<string>([
    "http://localhost:3000",
    "http://localhost:8081",
    "http://localhost:8082",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:8082",
    "https://urplatform.llc",
    "https://www.urplatform.llc",
  ]);

  const fromEnv = process.env.CORS_ALLOWED_ORIGINS ?? "";
  for (const part of fromEnv.split(",")) {
    const trimmed = part.trim();
    if (trimmed) origins.add(trimmed);
  }

  if (process.env.APP_URL) {
    origins.add(process.env.APP_URL.replace(/\/+$/, ""));
  }

  return origins;
}

export function isAllowedBrowserOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.has(origin.replace(/\/+$/, ""));
}

const ALLOWED_ORIGINS = parseAllowedOrigins();

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const raw =
    typeof forwarded === "string" && forwarded.length > 0
      ? (forwarded.split(",")[0]?.trim() ?? "unknown")
      : (req.socket.remoteAddress ?? "unknown");
  if (raw.startsWith("::ffff:")) return raw.slice("::ffff:".length);
  if (raw === "::1") return "127.0.0.1";
  return raw || "unknown";
}

export function getRequestId(req: Request): string {
  const existing = req.headers["x-request-id"];
  if (typeof existing === "string" && existing.length > 0) return existing.slice(0, 64);
  return randomUUID();
}

function bucketKey(parts: string[]): string {
  return parts.join(":");
}

function checkWindowLimit(
  store: Map<string, WindowBucket>,
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  let bucket = store.get(key);

  if (!bucket || now - bucket.windowStartMs >= windowMs) {
    bucket = { count: 0, windowStartMs: now };
  }

  bucket.count += 1;
  store.set(key, bucket);
  return bucket.count <= limit;
}

export function blockIp(ip: string, reason?: string): void {
  blockedIps.add(ip);
  console.warn(`[security] Blocked IP ${ip}${reason ? `: ${reason}` : ""}`);
}

export function isIpBlocked(ip: string): boolean {
  return blockedIps.has(ip);
}

export function unblockIp(ip: string): void {
  blockedIps.delete(ip);
}

export function _resetBlockedIpsForTests(): void {
  blockedIps.clear();
}

function getCircuit(namespace: ApiNamespace): CircuitState {
  let circuit = circuitBreakers.get(namespace);
  if (!circuit) {
    circuit = { failures: 0, windowStartMs: Date.now(), openUntilMs: 0, isOpen: false };
    circuitBreakers.set(namespace, circuit);
  }
  return circuit;
}

export function recordNamespaceSuccess(namespace: ApiNamespace): void {
  const circuit = getCircuit(namespace);
  circuit.failures = 0;
  circuit.isOpen = false;
}

/** Owner-approved ops remediation — reset a tripped namespace circuit. */
export function resetNamespaceCircuit(namespace: ApiNamespace): void {
  recordNamespaceSuccess(namespace);
}

export function recordNamespaceFailure(namespace: ApiNamespace): void {
  const now = Date.now();
  const circuit = getCircuit(namespace);

  if (now - circuit.windowStartMs >= CIRCUIT_WINDOW_MS) {
    circuit.failures = 0;
    circuit.windowStartMs = now;
  }

  circuit.failures += 1;

  if (circuit.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    circuit.isOpen = true;
    circuit.openUntilMs = now + CIRCUIT_OPEN_MS;
    console.error(
      `[security] Circuit OPEN for namespace "${namespace}" — isolated for ${CIRCUIT_OPEN_MS / 1000}s`,
    );
  }
}

export function assertNamespaceCircuitClosed(namespace: ApiNamespace): void {
  const circuit = getCircuit(namespace);
  const now = Date.now();

  if (circuit.isOpen && now < circuit.openUntilMs) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "This service is temporarily unavailable. Other features still work.",
    });
  }

  if (circuit.isOpen && now >= circuit.openUntilMs) {
    circuit.isOpen = false;
    circuit.failures = 0;
    circuit.windowStartMs = now;
  }
}

export function getNamespaceCircuitStatus(
  namespace: ApiNamespace,
): { isOpen: boolean; failures: number } {
  const circuit = getCircuit(namespace);
  const now = Date.now();
  if (circuit.isOpen && now >= circuit.openUntilMs) {
    return { isOpen: false, failures: circuit.failures };
  }
  return { isOpen: circuit.isOpen, failures: circuit.failures };
}

export function checkUserNamespaceLimit(
  namespace: ApiNamespace,
  userId: string,
): void {
  const limit = NAMESPACE_USER_LIMITS[namespace] ?? NAMESPACE_USER_LIMITS.default;
  const key = bucketKey(["user", namespace, userId]);
  const allowed = checkWindowLimit(userNamespaceBuckets, key, limit, HOUR_MS);

  if (!allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit reached for this feature. Try again later.`,
    });
  }
}

export function checkIpNamespaceLimit(namespace: ApiNamespace, ip: string): void {
  const key = bucketKey(["ip", namespace, ip]);
  const limit = NAMESPACE_IP_LIMITS_PER_MINUTE[namespace] ?? DEFAULT_IP_LIMIT_PER_MINUTE;
  const allowed = checkWindowLimit(ipNamespaceBuckets, key, limit, MINUTE_MS);

  if (!allowed) {
    blockIp(ip, `namespace ${namespace} abuse`);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests from this network.",
    });
  }
}

export function checkGlobalIpLimit(ip: string): boolean {
  const key = bucketKey(["global", ip]);
  return checkWindowLimit(globalIpBuckets, key, GLOBAL_IP_LIMIT_PER_MINUTE, MINUTE_MS);
}

/** Express middleware: security headers + request ID + IP blocklist */
export function securityHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = getRequestId(req);
  (req as Request & { requestId?: string }).requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(self), camera=()");
  if (ENV.isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  res.removeHeader("X-Powered-By");
  next();
}

/** Express middleware: strict CORS allowlist */
export function strictCorsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else if (!origin) {
    // Native mobile clients (Expo) often omit Origin; auth is enforced per tRPC route.
  } else if (!ENV.isProduction) {
    // Dev convenience for LAN Expo — still requires Bearer token on protected routes
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, Content-Type, Accept, Authorization, X-Request-Id",
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
}

/** Express middleware: global IP rate limit + blocklist for all /api routes */
export function apiIpGuardMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const ip = getClientIp(req);

  if (isIpBlocked(ip)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (!checkGlobalIpLimit(ip)) {
    blockIp(ip, "global API flood");
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  next();
}

export function sanitizeErrorMessage(message: string): string {
  if (ENV.isProduction) {
    if (message.includes("GOOGLE_") || message.includes("DATABASE") || message.includes("ENOENT")) {
      return "An internal error occurred.";
    }
  }
  return message;
}
