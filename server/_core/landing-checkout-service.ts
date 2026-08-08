/**
 * Landing-page platform pass checkout (Stripe webhook integration pending).
 */

import { createHash } from "crypto";
import { TRPCError } from "@trpc/server";
import { recordPaidMembership } from "./access-entitlements";
import { createHandoffToken } from "./app-handoff-service";
import { LANDING_ALL_SPECIALISTS_MONTHLY_CENTS } from "../../lib/landing-checkout-pricing";

const PURCHASE_COOLDOWN_MS = 60_000;
const purchaseCooldownByIp = new Map<string, number>();

function guestUserId(email: string): string {
  const hash = createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
  return `landing:${hash.slice(0, 16)}`;
}

function normalizeIp(ip: string | undefined): string {
  return (ip ?? "unknown").trim() || "unknown";
}

export function purchaseLandingPlatformPass(params: {
  email: string;
  ip: string;
  userId?: string;
}): {
  handoffToken: string;
  email: string;
  membershipId: string;
  priceCents: number | null;
} {
  const ipKey = normalizeIp(params.ip);
  const lastPurchase = purchaseCooldownByIp.get(ipKey);
  if (lastPurchase && Date.now() - lastPurchase < PURCHASE_COOLDOWN_MS) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Please wait a moment before trying again.",
    });
  }

  const email = params.email.toLowerCase().trim();
  const userId = params.userId ?? guestUserId(email);

  const membership = recordPaidMembership({
    userId,
    userEmail: email,
    plan: "month",
    durationDays: 30,
    source: "manual",
  });

  const handoffToken = createHandoffToken({
    email,
    membershipId: membership.id,
  });

  purchaseCooldownByIp.set(ipKey, Date.now());

  return {
    handoffToken,
    email,
    membershipId: membership.id,
    priceCents: LANDING_ALL_SPECIALISTS_MONTHLY_CENTS,
  };
}
