/**
 * Dev commerce — full platform without LLC/Stripe go-live.
 * Simulated checkout grants real in-app entitlements in development only.
 */

import { ENV } from "../server/_core/env";

export type CommerceMode = "simulated" | "live";

export const DEV_SIMULATED_COMMERCE_NOTICE =
  "Development mode: checkout is simulated — no LLC or live Stripe required. Subscriptions, shop orders, and talk time unlock in-app for testing.";

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
  if (ENV.isProduction && hasLiveStripeKeys()) return "live";
  if (ENV.isProduction) return "live";
  return "simulated";
}

export function isSimulatedCommerceMode(): boolean {
  return getCommerceMode() === "simulated";
}
