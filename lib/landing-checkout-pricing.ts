/** Landing-page bundle — all public specialists. Set cents when pricing is finalized. */
export const LANDING_ALL_SPECIALISTS_MONTHLY_CENTS: number | null = null;

export const LANDING_SPECIALIST_COUNT_LABEL = "45+";

export function formatLandingPlatformPassPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}/mo`;
}

export function getLandingPlatformPassPriceDisplay(): string | null {
  if (LANDING_ALL_SPECIALISTS_MONTHLY_CENTS == null) return null;
  return formatLandingPlatformPassPrice(LANDING_ALL_SPECIALISTS_MONTHLY_CENTS);
}
