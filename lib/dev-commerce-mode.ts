/**
 * Commerce mode.
 * Development never charges cards — even if live Stripe keys are present in .env.
 * Production charges only when live keys AND a webhook signing secret are set.
 */

export type CommerceMode = "simulated" | "live" | "unavailable";

export const DEV_SIMULATED_COMMERCE_NOTICE =
  "Development mode: checkout is simulated — no LLC or live Stripe required. Subscriptions, shop orders, and talk time unlock in-app for testing.";

export const LIVE_CHECKOUT_UNAVAILABLE_NOTICE =
  "Card checkout is not available yet. Live Stripe keys and a webhook signing secret are required in production.";

function isProductionEnv(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV === "production";
}

function envValue(name: string): string {
  return (typeof process !== "undefined" ? process.env[name]?.trim() : "") ?? "";
}

function publishableKey(): string {
  return envValue("STRIPE_PUBLISHABLE_KEY") || envValue("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
}

/** True only for real live-mode Stripe keys (never test or mock). */
export function hasLiveStripeKeys(): boolean {
  const secret = envValue("STRIPE_SECRET_KEY");
  const publishable = publishableKey();
  return secret.startsWith("sk_live_") && publishable.startsWith("pk_live_");
}

export function hasStripeWebhookSecret(): boolean {
  return envValue("STRIPE_WEBHOOK_SECRET").startsWith("whsec_");
}

/** Production may create Checkout Sessions only when fulfillment can be verified. */
export function isStripeLiveCheckoutReady(): boolean {
  return isProductionEnv() && hasLiveStripeKeys() && hasStripeWebhookSecret();
}

export function getCommerceMode(): CommerceMode {
  if (!isProductionEnv()) return "simulated";
  if (isStripeLiveCheckoutReady()) return "live";
  return "unavailable";
}

export function isSimulatedCommerceMode(): boolean {
  return getCommerceMode() === "simulated";
}
