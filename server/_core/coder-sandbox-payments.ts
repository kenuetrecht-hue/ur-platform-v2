/**
 * Stripe checkout flow for TechBuilder sandbox storage upgrades.
 */

import { TRPCError } from "@trpc/server";
import { getStripeIntegration } from "../stripe-integration";
import { ENV } from "./env";
import { SANDBOX_TIERS, upgradeSandboxTier, type SandboxTierId } from "./coder-sandbox-service";
import { recordSandboxPayment, updateSandboxPaymentStatus } from "../db-coder-sandbox";

const pendingUpgrades = new Map<
  string,
  { userId: string; tierId: SandboxTierId; amountCents: number }
>();

export async function createSandboxUpgradeCheckout(params: {
  userId: string;
  userEmail: string;
  userName: string;
  targetTier: SandboxTierId;
  isPlatformOwner: boolean;
}) {
  if (params.isPlatformOwner) {
    return await upgradeSandboxTier({
      userId: params.userId,
      targetTier: params.targetTier,
      isPlatformOwner: true,
      actingAsOwner: true,
    });
  }

  const tier = SANDBOX_TIERS[params.targetTier];
  if (!tier.upgradePriceUsd) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This tier is not available for purchase." });
  }

  if (params.targetTier === "starter") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Starter tier is free." });
  }

  const amountCents = Math.round(tier.upgradePriceUsd * 100);
  const stripe = getStripeIntegration();
  const customer = await stripe.getOrCreateCustomer(
    params.userId,
    params.userEmail,
    params.userName || "UR Platform User",
  );

  const intent = await stripe.createPaymentIntent(customer.id, amountCents, "USD", {
    userId: params.userId,
    product: "techbuilder_sandbox_upgrade",
    tierId: params.targetTier,
  });

  pendingUpgrades.set(intent.id, {
    userId: params.userId,
    tierId: params.targetTier,
    amountCents,
  });

  await recordSandboxPayment({
    userId: params.userId,
    tierId: params.targetTier as "builder" | "studio" | "enterprise",
    paymentIntentId: intent.id,
    amountCents,
    status: "pending",
  });

  return {
    mode: "checkout" as const,
    paymentIntentId: intent.id,
    clientSecret: intent.clientSecret,
    amountCents,
    currency: "USD",
    tier,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "pk_test_mock",
  };
}

export async function confirmSandboxUpgradePayment(params: {
  userId: string;
  paymentIntentId: string;
  paymentMethodId?: string;
  isPlatformOwner: boolean;
}) {
  const pending = pendingUpgrades.get(params.paymentIntentId);
  if (!pending || pending.userId !== params.userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Checkout session not found or expired." });
  }

  const stripe = getStripeIntegration();

  let methodId = params.paymentMethodId;
  if (!methodId && !ENV.isProduction) {
    const customer = await stripe.getOrCreateCustomer(params.userId, "dev@urplatform.local", "Dev User");
    const method = await stripe.addPaymentMethod(customer.id, "card", "4242", "visa", 12, 2030, true);
    methodId = method.id;
  }

  if (!methodId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Payment method required." });
  }

  try {
    await stripe.confirmPaymentIntent(params.paymentIntentId, methodId);
  } catch (error) {
    await updateSandboxPaymentStatus(params.paymentIntentId, "failed");
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Payment failed.",
    });
  }

  await updateSandboxPaymentStatus(params.paymentIntentId, "succeeded");
  pendingUpgrades.delete(params.paymentIntentId);

  return await upgradeSandboxTier({
    userId: params.userId,
    targetTier: pending.tierId,
    isPlatformOwner: params.isPlatformOwner,
    actingAsOwner: false,
  });
}
