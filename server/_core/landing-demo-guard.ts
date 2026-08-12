import { createHmac, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import {
  isSuspiciousDemoMessage,
  isSuspiciousDemoUserAgent,
  LANDING_DEMO_MAX_SEND_ATTEMPTS_PER_HOUR,
  LANDING_DEMO_MIN_PAGE_MS,
  LANDING_DEMO_TOKEN_TTL_MS,
} from "../../lib/landing-demo-policy";
import { blockIp } from "./api-security";
import { ENV } from "./env";

const sendAttemptsByIp = new Map<string, { count: number; windowStartMs: number }>();
const abuseScoreByIp = new Map<string, number>();

function normalizeIp(ip: string | undefined): string {
  return (ip ?? "unknown").trim() || "unknown";
}

function signingSecret(): string {
  const secret = ENV.cookieSecret.trim();
  if (secret.length >= 16) return secret;
  return "landing-demo-dev-only-secret";
}

function signPayload(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("hex");
}

/** Issue a short-lived demo token bound to the visitor IP. */
export function issueLandingDemoToken(ip: string): string {
  const issuedAt = Date.now();
  const payload = `${normalizeIp(ip)}:${issuedAt}`;
  const sig = signPayload(payload);
  return `${issuedAt}.${sig}`;
}

export function verifyLandingDemoToken(token: string, ip: string): boolean {
  const parts = token.trim().split(".");
  if (parts.length !== 2) return false;

  const issuedAt = Number(parts[0]);
  const sig = parts[1] ?? "";
  if (!Number.isFinite(issuedAt) || sig.length !== 64) return false;
  if (Date.now() - issuedAt > LANDING_DEMO_TOKEN_TTL_MS) return false;
  if (Date.now() - issuedAt < 0) return false;

  const payload = `${normalizeIp(ip)}:${issuedAt}`;
  const expected = signPayload(payload);

  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function recordSendAttempt(ip: string): void {
  const key = normalizeIp(ip);
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  let bucket = sendAttemptsByIp.get(key);
  if (!bucket || now - bucket.windowStartMs >= windowMs) {
    bucket = { count: 0, windowStartMs: now };
  }
  bucket.count += 1;
  sendAttemptsByIp.set(key, bucket);
}

function assertSendRateLimit(ip: string): void {
  const key = normalizeIp(ip);
  const bucket = sendAttemptsByIp.get(key);
  if (!bucket) return;
  if (Date.now() - bucket.windowStartMs >= 60 * 60 * 1000) return;
  if (bucket.count > LANDING_DEMO_MAX_SEND_ATTEMPTS_PER_HOUR) {
    blockIp(key, "landing demo send flood");
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many demo attempts. Try again later or create an account.",
    });
  }
}

function recordAbuse(ip: string): void {
  const key = normalizeIp(ip);
  const score = (abuseScoreByIp.get(key) ?? 0) + 1;
  abuseScoreByIp.set(key, score);
  if (score >= 5) {
    blockIp(key, "landing demo abuse");
  }
}

export function assertLandingDemoSendAllowed(params: {
  ip: string;
  userAgent?: string;
  honeypot?: string;
  demoToken: string;
  pageLoadedAtMs: number;
  message: string;
}): void {
  assertSendRateLimit(params.ip);
  recordSendAttempt(params.ip);

  if (params.honeypot && params.honeypot.trim().length > 0) {
    recordAbuse(params.ip);
    throw new TRPCError({ code: "BAD_REQUEST", message: "Demo unavailable." });
  }

  if (!verifyLandingDemoToken(params.demoToken, params.ip)) {
    recordAbuse(params.ip);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Demo session expired. Refresh the page and try again.",
    });
  }

  const elapsed = Date.now() - params.pageLoadedAtMs;
  if (!Number.isFinite(params.pageLoadedAtMs) || elapsed < LANDING_DEMO_MIN_PAGE_MS) {
    recordAbuse(params.ip);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Please wait a moment before sending your demo message.",
    });
  }
  if (elapsed > LANDING_DEMO_TOKEN_TTL_MS + 60_000) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Demo session expired. Refresh the page and try again.",
    });
  }

  if (isSuspiciousDemoUserAgent(params.userAgent)) {
    recordAbuse(params.ip);
    throw new TRPCError({ code: "FORBIDDEN", message: "Demo unavailable from this client." });
  }

  if (isSuspiciousDemoMessage(params.message)) {
    recordAbuse(params.ip);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "That message cannot be sent. Try a shorter, natural question.",
    });
  }
}

export function _resetLandingDemoGuardForTests(): void {
  sendAttemptsByIp.clear();
  abuseScoreByIp.clear();
}
