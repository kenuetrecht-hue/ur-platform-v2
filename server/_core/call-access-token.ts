import { createHmac, timingSafeEqual } from "crypto";
import { ENV } from "./env";
import { InternalServiceError } from "./service-errors";

const CALL_ACCESS_TTL_MS = 2 * 60 * 60 * 1000;

export type CallAccessPayload = {
  v: 1;
  roomId: string;
  userId: string;
  exp: number;
};

function signingSecret(): string {
  const secret = ENV.cookieSecret.trim();
  if (ENV.isProduction) {
    if (secret.length < 32) {
      throw new InternalServiceError("NOT_CONFIGURED", "Call access signing is not configured.");
    }
    return secret;
  }
  if (secret.length >= 16) return secret;
  return "call-access-dev-only-secret";
}

function signBody(body: string): string {
  return createHmac("sha256", signingSecret()).update(body).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function issueCallAccessToken(params: { roomId: string; userId: string }): string {
  const payload: CallAccessPayload = {
    v: 1,
    roomId: params.roomId,
    userId: params.userId,
    exp: Date.now() + CALL_ACCESS_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${signBody(body)}`;
}

export function verifyCallAccessToken(token: string): CallAccessPayload | null {
  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = trimmed.slice(0, dot);
  const sig = trimmed.slice(dot + 1);
  if (!sig || !safeEqual(sig, signBody(body))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as CallAccessPayload;
    if (parsed.v !== 1 || !parsed.roomId || !parsed.userId) return null;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
