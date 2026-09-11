/**
 * Local testing only. Production always requires 18+ ID front, back, and selfie.
 * Set DEV_SKIP_AGE_KYC=false in .env when you are ready to test the real ID check.
 */

export const DEV_AGE_KYC_BYPASS_NOTICE =
  "Development mode: 18+ ID check is skipped so you can test the rest of the app. Set DEV_SKIP_AGE_KYC=false and restart to test ID + selfie.";

export function isDevAgeKycBypassEnabled(): boolean {
  if (typeof process === "undefined") return false;
  const nodeEnv = process.env.NODE_ENV ?? "";
  if (nodeEnv === "production") return false;
  // Railway is the live site even if NODE_ENV was set wrong.
  if ((process.env.RAILWAY_ENVIRONMENT ?? "").trim()) return false;

  const flag = (process.env.DEV_SKIP_AGE_KYC ?? "").trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no" || flag === "off") return false;
  if (flag === "1" || flag === "true" || flag === "yes" || flag === "on") return true;

  // Unset: skip during `pnpm dev` only — never in unit tests (`NODE_ENV=test`).
  return nodeEnv === "development";
}
