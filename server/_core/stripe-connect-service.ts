/**
 * Stripe Connect Express — creators link a bank so Stripe can pay them.
 * Buyers still pay UR's Checkout; Stripe splits the charge.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { getStripeSecretKey } from "./secrets";
import { isStripeLiveCheckoutReady } from "../../lib/dev-commerce-mode";
import { getPlatformPublicOrigin } from "../../lib/platform-urls";
import { sanitizeUserText } from "./input-sanitize";

export type StripeConnectAccountRecord = {
  userId: string;
  stripeAccountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  createdAt: string;
  updatedAt: string;
};

const accounts = new Map<string, StripeConnectAccountRecord>();

export function _resetStripeConnectForTests(): void {
  accounts.clear();
}

export function getStripeConnectAccount(userId: string): StripeConnectAccountRecord | null {
  return accounts.get(userId) ?? null;
}

export function isStripeConnectReady(userId: string): boolean {
  const account = accounts.get(userId);
  return Boolean(account?.chargesEnabled && account.payoutsEnabled && account.stripeAccountId.startsWith("acct_"));
}

export function upsertStripeConnectAccount(record: StripeConnectAccountRecord): StripeConnectAccountRecord {
  accounts.set(record.userId, record);
  return record;
}

function stripeSecret(): string {
  return getStripeSecretKey();
}

async function stripeForm(
  path: string,
  body: URLSearchParams,
  method: "POST" | "GET" = "POST",
): Promise<Record<string, unknown>> {
  const secret = stripeSecret();
  if (!secret.startsWith("sk_live_") && !secret.startsWith("sk_test_")) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Stripe is not ready on the server yet.",
    });
  }
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "GET" ? undefined : body,
  });
  const json = (await response.json()) as Record<string, unknown> & { error?: { message?: string } };
  if (!response.ok) {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "Stripe could not finish that bank setup. Try again.",
    });
  }
  return json;
}

export function applyStripeAccountWebhook(account: {
  id?: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  metadata?: Record<string, string> | null;
}): StripeConnectAccountRecord | null {
  const accountId = typeof account.id === "string" ? account.id : "";
  if (!accountId.startsWith("acct_")) return null;
  const userId = account.metadata?.userId?.trim();
  const existing = userId
    ? accounts.get(userId)
    : [...accounts.values()].find((row) => row.stripeAccountId === accountId);
  if (!existing && !userId) return null;
  const next: StripeConnectAccountRecord = {
    userId: existing?.userId ?? userId!,
    stripeAccountId: accountId,
    chargesEnabled: account.charges_enabled === true,
    payoutsEnabled: account.payouts_enabled === true,
    detailsSubmitted: account.details_submitted === true,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return upsertStripeConnectAccount(next);
}

export async function startStripeConnectOnboarding(params: {
  userId: string;
  email: string;
}): Promise<{ url: string; accountId: string; simulated: boolean }> {
  const userId = sanitizeUserText(params.userId, 80);
  const email = sanitizeUserText(params.email, 254);
  const existing = accounts.get(userId);

  if (!isStripeLiveCheckoutReady()) {
    const accountId = existing?.stripeAccountId ?? `acct_sim_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    upsertStripeConnectAccount({
      userId,
      stripeAccountId: accountId,
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return {
      url: `${getPlatformPublicOrigin()}/creator-dashboard?stripeConnect=ready`,
      accountId,
      simulated: true,
    };
  }

  let accountId = existing?.stripeAccountId;
  if (!accountId) {
    const created = await stripeForm(
      "accounts",
      new URLSearchParams({
        type: "express",
        country: "US",
        email,
        "capabilities[card_payments][requested]": "true",
        "capabilities[transfers][requested]": "true",
        "metadata[userId]": userId,
      }),
    );
    accountId = typeof created.id === "string" ? created.id : "";
    if (!accountId.startsWith("acct_")) {
      throw new TRPCError({ code: "BAD_GATEWAY", message: "Stripe did not open a bank account." });
    }
    upsertStripeConnectAccount({
      userId,
      stripeAccountId: accountId,
      chargesEnabled: created.charges_enabled === true,
      payoutsEnabled: created.payouts_enabled === true,
      detailsSubmitted: created.details_submitted === true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const origin = getPlatformPublicOrigin();
  const link = await stripeForm(
    "account_links",
    new URLSearchParams({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${origin}/creator-dashboard?stripeConnect=refresh`,
      return_url: `${origin}/creator-dashboard?stripeConnect=return`,
    }),
  );
  const url = typeof link.url === "string" ? link.url : "";
  if (!url.startsWith("https://")) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "Stripe did not return a bank setup link." });
  }
  return { url, accountId, simulated: false };
}

export async function refreshStripeConnectStatus(userId: string): Promise<StripeConnectAccountRecord | null> {
  const existing = accounts.get(userId);
  if (!existing) return null;
  if (!isStripeLiveCheckoutReady()) return existing;
  const json = await stripeForm(`accounts/${existing.stripeAccountId}`, new URLSearchParams(), "GET");
  return applyStripeAccountWebhook({
    id: existing.stripeAccountId,
    charges_enabled: json.charges_enabled === true,
    payouts_enabled: json.payouts_enabled === true,
    details_submitted: json.details_submitted === true,
    metadata: { userId },
  });
}
