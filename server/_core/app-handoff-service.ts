/**
 * One-time mobile app handoff tokens after landing checkout.
 * Tokens expire in 15 minutes and tie membership to an email for instant signup.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";

const HANDOFF_TTL_MS = 15 * 60 * 1000;

type HandoffRecord = {
  token: string;
  email: string;
  membershipId: string;
  createdAt: number;
  consumedAt?: number;
};

const handoffStore = new Map<string, HandoffRecord>();

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function createHandoffToken(params: { email: string; membershipId: string }): string {
  const token = randomUUID().replace(/-/g, "");
  handoffStore.set(token, {
    token,
    email: normalizeEmail(params.email),
    membershipId: params.membershipId,
    createdAt: Date.now(),
  });
  return token;
}

export function redeemHandoffToken(token: string): { email: string; membershipId: string } {
  const key = token.trim();
  const entry = handoffStore.get(key);
  if (!entry) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Handoff link expired or invalid. Contact support if you completed payment.",
    });
  }

  if (Date.now() - entry.createdAt > HANDOFF_TTL_MS) {
    handoffStore.delete(key);
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Handoff link expired. Sign up with the same email used at checkout.",
    });
  }

  if (entry.consumedAt) {
    const reuseWindowMs = 2 * 60 * 1000;
    if (Date.now() - entry.consumedAt <= reuseWindowMs) {
      return { email: entry.email, membershipId: entry.membershipId };
    }
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This handoff link was already used. Log in with your account email.",
    });
  }

  entry.consumedAt = Date.now();
  handoffStore.set(key, entry);
  return { email: entry.email, membershipId: entry.membershipId };
}
