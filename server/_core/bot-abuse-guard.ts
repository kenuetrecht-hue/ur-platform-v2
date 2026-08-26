/**
 * Extra bot defenses on public auth challenges (Turnstile, signup, login).
 * Complements Cloudflare Turnstile — does not replace it.
 */

import { TRPCError } from "@trpc/server";
import {
  AUTH_CHALLENGE_MAX_PER_IP_PER_10_MIN,
  SIGNUP_MAX_PER_IP_PER_HOUR,
  isDisposableEmail,
} from "../../lib/bot-abuse-policy";
import { isSuspiciousDemoUserAgent } from "../../lib/landing-demo-policy";
import { blockIp } from "./api-security";
import {
  assertCreatorDisplayNameAllowed,
  mapContentProtectionError,
} from "./creator-content-protection-service";

const TEN_MIN_MS = 10 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const challengeByIp = new Map<string, { count: number; windowStartMs: number }>();
const signupByIp = new Map<string, { count: number; windowStartMs: number }>();
const abuseScoreByIp = new Map<string, number>();

function normalizeIp(ip: string | undefined): string {
  return (ip ?? "unknown").trim() || "unknown";
}

function bumpWindow(
  store: Map<string, { count: number; windowStartMs: number }>,
  key: string,
  windowMs: number,
): number {
  const now = Date.now();
  let bucket = store.get(key);
  if (!bucket || now - bucket.windowStartMs >= windowMs) {
    bucket = { count: 0, windowStartMs: now };
  }
  bucket.count += 1;
  store.set(key, bucket);
  return bucket.count;
}

function recordAbuse(ip: string, reason: string): void {
  const key = normalizeIp(ip);
  const score = (abuseScoreByIp.get(key) ?? 0) + 1;
  abuseScoreByIp.set(key, score);
  if (score >= 6) {
    blockIp(key, reason);
  }
}

export function assertHumanClient(userAgent: string | undefined, ip: string): void {
  const ua = (userAgent ?? "").trim();
  // Empty/short UA is common on native apps and privacy browsers — only block known scripts.
  if (ua.length < 8) return;
  if (!isSuspiciousDemoUserAgent(ua)) return;
  recordAbuse(ip, "bot user-agent on auth");
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "This client cannot complete the security check. Use the UR Platform website.",
  });
}

export function assertAuthChallengeAllowed(params: {
  ip: string;
  userAgent?: string;
  action: "login" | "signup" | "landing_demo" | "age_kyc";
  email?: string;
  displayName?: string;
  honeypot?: string;
}): void {
  const ip = normalizeIp(params.ip);

  if (params.honeypot && params.honeypot.trim().length > 0) {
    recordAbuse(ip, "auth honeypot");
    throw new TRPCError({ code: "BAD_REQUEST", message: "Security check failed. Refresh and try again." });
  }

  assertHumanClient(params.userAgent, ip);

  const challenges = bumpWindow(challengeByIp, ip, TEN_MIN_MS);
  if (challenges > AUTH_CHALLENGE_MAX_PER_IP_PER_10_MIN) {
    blockIp(ip, "auth challenge flood");
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many security checks from this network. Try again later.",
    });
  }

  if (params.action === "signup") {
    const signups = bumpWindow(signupByIp, ip, HOUR_MS);
    if (signups > SIGNUP_MAX_PER_IP_PER_HOUR) {
      blockIp(ip, "signup velocity");
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many signups from this network. Try again later.",
      });
    }

    const email = params.email?.trim() ?? "";
    if (!email.includes("@") || isDisposableEmail(email)) {
      recordAbuse(ip, "disposable signup email");
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Use a lasting personal or work email. Disposable inboxes are not allowed.",
      });
    }

    if (params.displayName?.trim()) {
      try {
        assertCreatorDisplayNameAllowed({
          userId: `pending:${email.toLowerCase()}`,
          displayName: params.displayName,
        });
      } catch (error) {
        mapContentProtectionError(error);
      }
    }
  }
}

export function _resetBotAbuseGuardForTests(): void {
  challengeByIp.clear();
  signupByIp.clear();
  abuseScoreByIp.clear();
}
