/**
 * Live Stripe Checkout — production only.
 * Development never constructs a Stripe client, even if live keys are in .env.
 * Entitlements are granted only after a signed webhook, not from the client.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { InternalServiceError } from "./service-errors";
import { ENV } from "./env";
import {
  getStripePublishableKey,
  getStripeSecretKey,
  getStripeWebhookSecret,
} from "./secrets";
import { isStripeLiveCheckoutReady } from "../../lib/dev-commerce-mode";
import { getPlatformPublicOrigin } from "../../lib/platform-urls";
import { getAiTalkPack, type AiTalkPackId } from "../../lib/ai-talk-pricing";
import { calculateCustomerCheckout } from "../../lib/stripe-checkout-pricing";
import { purchaseAiTalkPack } from "./ai-premium-media-service";
import { splitCreatorStripeCharge, type CreatorStripeKind } from "../../lib/stripe-connect-split";
import { CREATOR_PAYOUT_SHARE, recordStripeConnectSettlement } from "./creator-payout-service";
import { getStripeConnectAccount, isStripeConnectReady } from "./stripe-connect-service";
import { creditCreatorTipEarnings } from "./partner-program-service";

export const STRIPE_TALK_PACK_KIND = "talk_pack";
export const STRIPE_CREATOR_SALE_KIND = "creator_sale";
export const STRIPE_CREATOR_TIP_KIND = "creator_tip";
const STRIPE_SIGNATURE_TOLERANCE_SEC = 300;

export type StripeCheckoutSessionCreateParams = {
  mode: "payment";
  client_reference_id?: string;
  customer_email?: string;
  success_url: string;
  cancel_url: string;
  line_items: Array<{
    quantity: number;
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: { name: string; description?: string };
    };
  }>;
  metadata: Record<string, string>;
  applicationFeeCents?: number;
  transferDestination?: string;
  /** Exact cents the creator’s Connect account receives. */
  transferCents?: number;
};

export type StripeCheckoutAdapter = {
  createSession: (params: StripeCheckoutSessionCreateParams) => Promise<{
    id: string;
    url: string | null;
  }>;
};

export type StripeWebhookEvent = {
  type: string;
  data: { object: Record<string, unknown> };
};

const fulfilledSessionIds = new Set<string>();
let checkoutAdapter: StripeCheckoutAdapter | null = null;

export function _resetStripeCheckoutForTests(): void {
  fulfilledSessionIds.clear();
  checkoutAdapter = null;
}

export function _setStripeCheckoutAdapterForTests(adapter: StripeCheckoutAdapter | null): void {
  checkoutAdapter = adapter;
}

function assertLiveCheckoutAllowed(): void {
  if (!ENV.isProduction) {
    throw new InternalServiceError(
      "NOT_CONFIGURED",
      "Live card checkout is disabled outside production.",
    );
  }
  if (!isStripeLiveCheckoutReady()) {
    throw new InternalServiceError(
      "NOT_CONFIGURED",
      "Live Stripe keys and webhook signing secret are required.",
    );
  }
  const secret = getStripeSecretKey();
  if (!secret.startsWith("sk_live_")) {
    throw new InternalServiceError("NOT_CONFIGURED", "Stripe secret is not a live key.");
  }
  if (!getStripePublishableKey().startsWith("pk_live_")) {
    throw new InternalServiceError("NOT_CONFIGURED", "Stripe publishable key is not live.");
  }
  if (!getStripeWebhookSecret().startsWith("whsec_")) {
    throw new InternalServiceError("NOT_CONFIGURED", "Stripe webhook secret is missing.");
  }
}

async function getAdapter(): Promise<StripeCheckoutAdapter> {
  if (checkoutAdapter) return checkoutAdapter;
  return {
    createSession: (params) => createStripeCheckoutSessionViaHttps(params),
  };
}

async function createStripeCheckoutSessionViaHttps(
  params: StripeCheckoutSessionCreateParams,
): Promise<{ id: string; url: string | null }> {
  const secret = getStripeSecretKey();
  const body = new URLSearchParams();
  body.set("mode", params.mode);
  body.set("success_url", params.success_url);
  body.set("cancel_url", params.cancel_url);
  if (params.client_reference_id) body.set("client_reference_id", params.client_reference_id);
  if (params.customer_email) body.set("customer_email", params.customer_email);
  params.line_items.forEach((item, index) => {
    body.set(`line_items[${index}][quantity]`, String(item.quantity));
    body.set(`line_items[${index}][price_data][currency]`, item.price_data.currency);
    body.set(`line_items[${index}][price_data][unit_amount]`, String(item.price_data.unit_amount));
    body.set(`line_items[${index}][price_data][product_data][name]`, item.price_data.product_data.name);
    if (item.price_data.product_data.description) {
      body.set(
        `line_items[${index}][price_data][product_data][description]`,
        item.price_data.product_data.description,
      );
    }
  });
  for (const [key, value] of Object.entries(params.metadata)) {
    body.set(`metadata[${key}]`, value);
  }
  if (
    typeof params.applicationFeeCents === "number" &&
    params.applicationFeeCents >= 0 &&
    params.transferDestination?.startsWith("acct_")
  ) {
    body.set("payment_intent_data[application_fee_amount]", String(params.applicationFeeCents));
    body.set("payment_intent_data[transfer_data][destination]", params.transferDestination);
    if (typeof params.transferCents === "number" && params.transferCents >= 0) {
      body.set("payment_intent_data[transfer_data][amount]", String(params.transferCents));
    }
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await response.json()) as { id?: string; url?: string | null; error?: { message?: string } };
  if (!response.ok || !json.id) {
    throw new InternalServiceError("UPSTREAM_FAILED", "Stripe checkout could not be created.");
  }
  return { id: json.id, url: json.url ?? null };
}

export async function createTalkPackCheckoutSession(params: {
  userId: string;
  userEmail: string;
  packId: AiTalkPackId;
  billingStateCode: string;
}): Promise<{ checkoutUrl: string; sessionId: string; totalCents: number }> {
  assertLiveCheckoutAllowed();

  const pack = getAiTalkPack(params.packId);
  const checkout = calculateCustomerCheckout(pack.priceCents, params.billingStateCode);
  const origin = getPlatformPublicOrigin();
  const adapter = await getAdapter();

  const session = await adapter.createSession({
    mode: "payment",
    client_reference_id: params.userId.slice(0, 200),
    customer_email: params.userEmail.trim() ? params.userEmail.trim().slice(0, 200) : undefined,
    success_url: `${origin}/ais?talkCheckout=success`,
    cancel_url: `${origin}/ais?talkCheckout=cancel`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: checkout.totalCents,
          product_data: {
            name: pack.label,
            description: `${pack.totalMinutes} AI talk minutes`,
          },
        },
      },
    ],
    metadata: {
      kind: STRIPE_TALK_PACK_KIND,
      userId: params.userId,
      packId: params.packId,
      billingStateCode: params.billingStateCode,
      priceCents: String(pack.priceCents),
    },
  });

  if (!session.url) {
    throw new InternalServiceError("UPSTREAM_FAILED", "Stripe did not return a checkout URL.");
  }

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    totalCents: checkout.totalCents,
  };
}

export async function createCreatorMarketplaceCheckout(params: {
  buyerUserId: string;
  buyerEmail: string;
  creatorUserId: string;
  kind: CreatorStripeKind;
  subtotalCents: number;
  billingStateCode: string;
  productName: string;
  successPath: string;
  cancelPath: string;
  extraMetadata?: Record<string, string>;
}): Promise<{ checkoutUrl: string; sessionId: string; totalCents: number; split: ReturnType<typeof splitCreatorStripeCharge> }> {
  assertLiveCheckoutAllowed();
  if (!isStripeConnectReady(params.creatorUserId)) {
    throw new InternalServiceError(
      "NOT_CONFIGURED",
      "This creator has not connected a Stripe bank account yet.",
    );
  }
  const account = getStripeConnectAccount(params.creatorUserId);
  if (!account) {
    throw new InternalServiceError("NOT_CONFIGURED", "This creator has not connected a Stripe bank account yet.");
  }

  const priced = calculateCustomerCheckout(params.subtotalCents, params.billingStateCode);
  const split = splitCreatorStripeCharge({
    kind: params.kind,
    subtotalCents: priced.subtotalCents,
    salesTaxCents: priced.salesTaxCents,
    stateFeeCents: priced.stateFeeCents,
    saleShare: CREATOR_PAYOUT_SHARE,
  });
  const origin = getPlatformPublicOrigin();
  const adapter = await getAdapter();
  const kindMeta = params.kind === "tip" ? STRIPE_CREATOR_TIP_KIND : STRIPE_CREATOR_SALE_KIND;

  const session = await adapter.createSession({
    mode: "payment",
    client_reference_id: params.buyerUserId.slice(0, 200),
    customer_email: params.buyerEmail.trim() ? params.buyerEmail.trim().slice(0, 200) : undefined,
    success_url: `${origin}${params.successPath}`,
    cancel_url: `${origin}${params.cancelPath}`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: priced.totalCents,
          product_data: { name: params.productName.slice(0, 120) },
        },
      },
    ],
    applicationFeeCents: split.applicationFeeCents,
    transferDestination: account.stripeAccountId,
    transferCents: split.creatorCents,
    metadata: {
      kind: kindMeta,
      userId: params.buyerUserId,
      creatorUserId: params.creatorUserId,
      billingStateCode: params.billingStateCode,
      priceCents: String(params.subtotalCents),
      creatorCents: String(split.creatorCents),
      platformFeeCents: String(split.platformFeeCents),
      ...(params.extraMetadata ?? {}),
    },
  });

  if (!session.url) {
    throw new InternalServiceError("UPSTREAM_FAILED", "Stripe did not return a checkout URL.");
  }
  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    totalCents: priced.totalCents,
    split,
  };
}

export function fulfillStripeCheckoutSession(session: {
  id: string;
  payment_status?: string | null;
  metadata?: Record<string, string> | null;
}): { handled: boolean; ignored: boolean } {
  if (session.payment_status && session.payment_status !== "paid") {
    return { handled: false, ignored: true };
  }
  if (fulfilledSessionIds.has(session.id)) {
    return { handled: true, ignored: false };
  }

  const metadata = session.metadata ?? {};
  if (metadata.kind === STRIPE_CREATOR_SALE_KIND || metadata.kind === STRIPE_CREATOR_TIP_KIND) {
    const creatorUserId = metadata.creatorUserId?.trim();
    const creatorCents = Number.parseInt(metadata.creatorCents ?? "", 10);
    const platformFeeCents = Number.parseInt(metadata.platformFeeCents ?? "", 10);
    const priceCents = Number.parseInt(metadata.priceCents ?? "", 10);
    if (!creatorUserId || !Number.isFinite(creatorCents) || !Number.isFinite(priceCents)) {
      return { handled: false, ignored: true };
    }
    const kind = metadata.kind === STRIPE_CREATOR_TIP_KIND ? "tip" : "sale";
    recordStripeConnectSettlement({
      creatorUserId,
      kind,
      grossCents: priceCents,
      netCents: creatorCents,
      platformFeeCents: Number.isFinite(platformFeeCents) ? platformFeeCents : priceCents - creatorCents,
      sourceTransactionId: session.id,
    });
    if (kind === "tip") {
      try {
        creditCreatorTipEarnings(creatorUserId, priceCents);
      } catch {
        /* Settlement still books; creator profile credit needs an enrolled creator. */
      }
    }
    fulfilledSessionIds.add(session.id);
    return { handled: true, ignored: false };
  }

  if (metadata.kind !== STRIPE_TALK_PACK_KIND) {
    return { handled: false, ignored: true };
  }

  const userId = metadata.userId?.trim();
  const packId = metadata.packId?.trim() as AiTalkPackId | undefined;
  const billingStateCode = metadata.billingStateCode?.trim();
  const priceCents = Number.parseInt(metadata.priceCents ?? "", 10);
  if (!userId || !packId || !billingStateCode || !Number.isFinite(priceCents)) {
    return { handled: false, ignored: true };
  }

  purchaseAiTalkPack({
    userId,
    userEmail: "",
    packId,
    billingStateCode,
    priceCents,
  });
  fulfilledSessionIds.add(session.id);
  return { handled: true, ignored: false };
}

export function createStripeTestSignatureHeader(payload: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const signedPayload = `${timestamp}.${payload}`;
  const v1 = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

export function verifyStripeWebhookEvent(rawBody: string, signature: string): StripeWebhookEvent {
  const secret = getStripeWebhookSecret();
  if (!secret.startsWith("whsec_")) {
    throw new InternalServiceError("NOT_CONFIGURED", "Stripe webhook secret is missing.");
  }

  const parts = signature.split(",").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  const timestamp = Number.parseInt(timestampPart?.slice(2) ?? "", 10);
  if (!Number.isFinite(timestamp) || signatures.length === 0) {
    throw new InternalServiceError("UPSTREAM_FAILED", "Stripe signature is invalid.");
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (age > STRIPE_SIGNATURE_TOLERANCE_SEC) {
    throw new InternalServiceError("UPSTREAM_FAILED", "Stripe signature is too old.");
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const valid = signatures.some((value) => {
    try {
      const found = Buffer.from(value, "hex");
      return found.length === expectedBuffer.length && timingSafeEqual(found, expectedBuffer);
    } catch {
      return false;
    }
  });
  if (!valid) {
    throw new InternalServiceError("UPSTREAM_FAILED", "Stripe signature does not match.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new InternalServiceError("UPSTREAM_FAILED", "Stripe webhook payload is not JSON.");
  }
  if (!parsed || typeof parsed !== "object" || !("type" in parsed) || !("data" in parsed)) {
    throw new InternalServiceError("UPSTREAM_FAILED", "Stripe webhook payload is incomplete.");
  }
  return parsed as StripeWebhookEvent;
}
