import { createHmac, timingSafeEqual } from "crypto";
import { ENV } from "./env";

export const AGE_KYC_PASS_TTL_MS = 30 * 60 * 1000;

export type AgeKycPassPayload = {
  v: 1;
  exp: number;
  front: string;
  back: string;
  selfie: string;
};

function signingSecret(): string {
  const secret = ENV.cookieSecret.trim();
  if (secret.length >= 16) return secret;
  return "age-kyc-pass-dev-only-secret";
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

export function issueAgeKycPassToken(hashes: {
  front: string;
  back: string;
  selfie: string;
}): string {
  const payload: AgeKycPassPayload = {
    v: 1,
    exp: Date.now() + AGE_KYC_PASS_TTL_MS,
    front: hashes.front,
    back: hashes.back,
    selfie: hashes.selfie,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${signBody(body)}`;
}

export function verifyAgeKycPassToken(token: string): AgeKycPassPayload | null {
  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = trimmed.slice(0, dot);
  const sig = trimmed.slice(dot + 1);
  if (!body || !sig || !safeEqual(sig, signBody(body))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AgeKycPassPayload;
    if (parsed.v !== 1) return null;
    if (!Number.isFinite(parsed.exp) || parsed.exp < Date.now()) return null;
    if (!parsed.front || !parsed.back || !parsed.selfie) return null;
    return parsed;
  } catch {
    return null;
  }
}
