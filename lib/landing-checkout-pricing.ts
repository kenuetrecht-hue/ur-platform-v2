import { PLATFORM_PASS_CENTS } from "./ai-subscription-pricing";

/** Landing-page bundle — same monthly text pass sold in the app. */
export const LANDING_ALL_SPECIALISTS_MONTHLY_CENTS: number = PLATFORM_PASS_CENTS.month;

export const LANDING_SPECIALIST_COUNT_LABEL = "45+";

export function formatLandingPlatformPassPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}/mo`;
}

export function getLandingPlatformPassPriceDisplay(): string {
  return formatLandingPlatformPassPrice(LANDING_ALL_SPECIALISTS_MONTHLY_CENTS);
}
