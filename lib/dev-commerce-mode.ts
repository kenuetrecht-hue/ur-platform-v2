/**
 * Dev commerce — full platform without LLC/Stripe go-live.
 * Simulated checkout grants real in-app entitlements in development only.
 */

export type CommerceMode = "simulated" | "live";

export const DEV_SIMULATED_COMMERCE_NOTICE =
  "Development mode: checkout is simulated — no LLC or live Stripe required. Subscriptions, shop orders, and talk time unlock in-app for testing.";

function isProductionEnv(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV === "production";
}

export function hasLiveStripeKeys(): boolean {
  const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const publishable = process.env.STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  return (
    secret.length > 0 &&
    publishable.length > 0 &&
    !secret.includes("_mock") &&
    !secret.startsWith("sk_test_mock")
  );
}

export function getCommerceMode(): CommerceMode {
  if (isProductionEnv() && hasLiveStripeKeys()) return "live";
  if (isProductionEnv()) return "live";
  return "simulated";
}

export function isSimulatedCommerceMode(): boolean {
  return getCommerceMode() === "simulated";
}
