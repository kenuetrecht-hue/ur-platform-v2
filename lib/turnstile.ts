/** Public Turnstile site key only — never put the secret in EXPO_PUBLIC_ vars. */

export const TURNSTILE_TOKEN_MAX_LENGTH = 4096;

export type TurnstileAction = "login" | "signup" | "landing_demo" | "age_kyc";

export function getTurnstileSiteKey(): string {
  return (
    (typeof process !== "undefined" ? process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY : "") ?? ""
  ).trim();
}
